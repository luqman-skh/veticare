/**
 * VetiCare - Supabase Authentication Module
 * Handles Login, Registration, Session Management, and UI Access Control
 */

import { createClient } from '@supabase/supabase-js';

window.app = window.app || {};

// Read environment config
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL)
    || (typeof window !== 'undefined' && window.VETICARE_SUPABASE_URL)
    || 'https://hjzhexljtymlsyvjxcjj.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY)
    || (typeof window !== 'undefined' && window.VETICARE_SUPABASE_ANON_KEY)
    || 'sb_publishable_MvjI9cZdr04r8VvM47oY6A_VTIi3yXp';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

app.auth = {
    client: supabase,
    currentUser: null,
    isInitialized: false,
    mode: 'signin', // 'signin' or 'signup'

    init: async () => {
        app.auth.bindUI();

        try {
            // Check for existing session in localStorage / Supabase
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.warn('Error checking existing Supabase session:', error);
            }

            if (session && session.user) {
                app.auth.currentUser = session.user;
                app.auth.showApp();
                await app.auth.startClinicApp();
            } else {
                app.auth.showLogin();
            }
        } catch (err) {
            console.error('Auth initialization error:', err);
            app.auth.showLogin();
        }

        // Listen for authentication state changes (login, logout, token refresh)
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session && session.user) {
                app.auth.currentUser = session.user;
                app.auth.showApp();
                if (!app.auth.isInitialized) {
                    await app.auth.startClinicApp();
                }
            } else if (event === 'SIGNED_OUT') {
                app.auth.currentUser = null;
                app.auth.isInitialized = false;
                app.auth.showLogin();
            }
        });
    },

    // Launch clinic application once authenticated
    startClinicApp: async () => {
        if (app.auth.isInitialized) return;
        app.auth.isInitialized = true;
        
        try {
            await app.db.init();
            app.router.init();
        } catch (err) {
            console.error('Error starting clinic application after auth:', err);
        }
    },

    // Show login screen and hide main app
    showLogin: () => {
        const authScreen = document.getElementById('auth-screen');
        const appContainer = document.getElementById('app-container');
        
        if (authScreen) authScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';

        // Clear any previous alerts
        app.auth.clearAlerts();
    },

    // Reveal main application and update user profile in sidebar
    showApp: () => {
        const authScreen = document.getElementById('auth-screen');
        const appContainer = document.getElementById('app-container');
        
        if (authScreen) authScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';

        if (app.auth.currentUser) {
            app.auth.updateProfileUI(app.auth.currentUser);
        }
    },

    // Update sidebar avatar and user name
    updateProfileUI: (user) => {
        const email = user.email || 'staff@veticare.com';
        const namePart = (user.user_metadata && user.user_metadata.full_name) 
            ? user.user_metadata.full_name 
            : email.split('@')[0];
        
        // Capitalize namePart
        const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        const initials = displayName.slice(0, 2).toUpperCase();

        const avatarEl = document.getElementById('sidebar-user-avatar');
        const nameEl = document.getElementById('sidebar-user-name');
        const roleEl = document.getElementById('sidebar-user-role');

        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl) nameEl.textContent = displayName.startsWith('Dr.') ? displayName : `Dr. ${displayName}`;
        if (roleEl) roleEl.textContent = email;
    },

    // Sign in with email & password
    signIn: async (email, password) => {
        app.auth.setLoading(true);
        app.auth.clearAlerts();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (data && data.user) {
                app.auth.currentUser = data.user;
                app.auth.showApp();
                await app.auth.startClinicApp();
            }
        } catch (err) {
            console.error('Sign in error:', err);
            let msg = err.message || 'Invalid email or password.';
            if (msg.includes('Invalid login credentials')) {
                msg = 'Incorrect email or password. Please verify your credentials or register an account.';
            } else if (msg.includes('Email not confirmed')) {
                msg = 'Email address has not been confirmed yet. Please check your inbox.';
            }
            app.auth.showError(msg);
        } finally {
            app.auth.setLoading(false);
        }
    },

    // Register / Sign up new account
    signUp: async (email, password) => {
        app.auth.setLoading(true);
        app.auth.clearAlerts();

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            if (data.session) {
                // Immediate session granted (email confirmation disabled in Supabase)
                app.auth.currentUser = data.user;
                app.auth.showApp();
                await app.auth.startClinicApp();
            } else if (data.user) {
                // Email confirmation required by Supabase project settings
                app.auth.showNotice('Account created successfully! Please check your inbox, then sign in.');
                app.auth.setMode('signin');
            }
        } catch (err) {
            console.error('Sign up error:', err);
            app.auth.showError(err.message || 'Could not create account. Please try again.');
        } finally {
            app.auth.setLoading(false);
        }
    },

    // Sign out
    signOut: async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Sign out warning:', err);
        } finally {
            app.auth.currentUser = null;
            app.auth.isInitialized = false;
            // Clear local states
            app.auth.showLogin();
        }
    },

    // Switch between Sign In and Sign Up tabs
    setMode: (mode) => {
        app.auth.mode = mode;
        const tabSignIn = document.getElementById('auth-tab-signin');
        const tabSignUp = document.getElementById('auth-tab-signup');
        const heading = document.getElementById('auth-heading');
        const subheading = document.getElementById('auth-subheading');
        const submitText = document.getElementById('auth-submit-text');
        const metaRow = document.getElementById('auth-meta-row');

        if (mode === 'signup') {
            if (tabSignIn) tabSignIn.classList.remove('active');
            if (tabSignUp) tabSignUp.classList.add('active');
            if (heading) heading.textContent = 'Create Staff Account';
            if (subheading) subheading.textContent = 'Register a new clinician or receptionist profile';
            if (submitText) submitText.textContent = 'Create Account';
            if (metaRow) metaRow.style.display = 'none';
        } else {
            if (tabSignIn) tabSignIn.classList.add('active');
            if (tabSignUp) tabSignUp.classList.remove('active');
            if (heading) heading.textContent = 'Sign In to Clinic Portal';
            if (subheading) subheading.textContent = 'Access patient records, schedules, and clinical insights';
            if (submitText) submitText.textContent = 'Sign In';
            if (metaRow) metaRow.style.display = 'flex';
        }
    },

    showError: (message) => {
        const errEl = document.getElementById('auth-error');
        if (errEl) {
            errEl.textContent = message;
            errEl.style.display = 'block';
        }
    },

    showNotice: (message) => {
        const noticeEl = document.getElementById('auth-notice');
        if (noticeEl) {
            noticeEl.textContent = message;
            noticeEl.style.display = 'block';
        }
    },

    clearAlerts: () => {
        const errEl = document.getElementById('auth-error');
        const noticeEl = document.getElementById('auth-notice');
        if (errEl) errEl.style.display = 'none';
        if (noticeEl) noticeEl.style.display = 'none';
    },

    setLoading: (isLoading) => {
        const submitBtn = document.getElementById('auth-submit-btn');
        const submitText = document.getElementById('auth-submit-text');
        const spinner = document.getElementById('auth-spinner');

        if (submitBtn) submitBtn.disabled = isLoading;
        if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
        if (submitText) submitText.style.opacity = isLoading ? '0.7' : '1';
    },

    // Bind event handlers
    bindUI: () => {
        const form = document.getElementById('auth-form');
        const tabSignIn = document.getElementById('auth-tab-signin');
        const tabSignUp = document.getElementById('auth-tab-signup');
        const togglePwd = document.getElementById('auth-toggle-password');
        const pwdInput = document.getElementById('auth-password');
        const signOutBtn = document.getElementById('btn-signout');
        const forgotLink = document.getElementById('auth-forgot-link');

        if (tabSignIn) {
            tabSignIn.onclick = () => app.auth.setMode('signin');
        }
        if (tabSignUp) {
            tabSignUp.onclick = () => app.auth.setMode('signup');
        }

        if (togglePwd && pwdInput) {
            togglePwd.onclick = () => {
                const isPassword = pwdInput.type === 'password';
                pwdInput.type = isPassword ? 'text' : 'password';
                togglePwd.classList.toggle('active', isPassword);
            };
        }

        if (forgotLink) {
            forgotLink.onclick = () => {
                const email = document.getElementById('auth-email')?.value.trim();
                if (!email) {
                    alert('Please enter your email address in the field above first.');
                    return;
                }
                supabase.auth.resetPasswordForEmail(email)
                    .then(({ error }) => {
                        if (error) throw error;
                        app.auth.showNotice('Password reset link sent to your email.');
                    })
                    .catch(err => {
                        app.auth.showError(err.message || 'Could not send reset email.');
                    });
            };
        }

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('auth-email').value.trim();
                const password = document.getElementById('auth-password').value;

                if (!email || !password) {
                    app.auth.showError('Please provide both email and password.');
                    return;
                }

                if (app.auth.mode === 'signup') {
                    await app.auth.signUp(email, password);
                } else {
                    await app.auth.signIn(email, password);
                }
            };
        }

        if (signOutBtn) {
            signOutBtn.onclick = (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to sign out of VetiCare?')) {
                    app.auth.signOut();
                }
            };
        }
    }
};

