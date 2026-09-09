"""Query and update the VetiCare SQLite database.

Examples:
    python query_database.py show-costs
    python query_database.py update-costs --treatment-cost 150 --consultation-fee 60 --medicine-cost 20
    python query_database.py sql "SELECT * FROM pets"

Cost columns in this database:
    treatments.cost
    invoices.consultationFee
    invoices.treatmentCost
    invoices.medicineCost
    invoices.tax
    invoices.total

The update command changes every matching cost in the database and recalculates
invoice tax and total using the application's 8% tax rule by default.
"""

import argparse
import os
import sqlite3
import sys


DB_FILE = os.path.join(os.path.dirname(__file__), "veticare.db")
DEFAULT_TAX_RATE = 0.08


def connect_database(database_path):
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def show_costs(connection):
    query = """
        SELECT
            invoices.id AS invoice_id,
            pets.name AS pet_name,
            treatments.id AS treatment_id,
            treatments.cost AS treatment_cost,
            invoices.consultationFee AS consultation_fee,
            invoices.treatmentCost AS invoice_treatment_cost,
            invoices.medicineCost AS medicine_cost,
            invoices.tax,
            invoices.total,
            invoices.status
        FROM invoices
        LEFT JOIN pets ON pets.id = invoices.petId
        LEFT JOIN treatments ON treatments.id = invoices.treatmentId
        ORDER BY invoices.dateTime, invoices.id
    """
    rows = connection.execute(query).fetchall()
    if not rows:
        print("No invoice costs found.")
        return

    headers = (
        "invoice_id", "pet_name", "treatment_id", "treatment_cost",
        "consultation_fee", "invoice_treatment_cost", "medicine_cost",
        "tax", "total", "status",
    )
    print("\t".join(headers))
    for row in rows:
        print("\t".join(str(row[header]) for header in headers))


def update_costs(connection, args):
    if all(value is None for value in (
        args.treatment_cost,
        args.consultation_fee,
        args.medicine_cost,
    )):
        raise ValueError(
            "Provide at least one of --treatment-cost, --consultation-fee, "
            "or --medicine-cost."
        )

    with connection:
        if args.treatment_cost is not None:
            connection.execute(
                "UPDATE treatments SET cost = ?",
                (args.treatment_cost,),
            )
            # Keep each invoice's treatment amount linked to its treatment row.
            connection.execute(
                """
                UPDATE invoices
                SET treatmentCost = (
                    SELECT cost FROM treatments
                    WHERE treatments.id = invoices.treatmentId
                )
                WHERE treatmentId IS NOT NULL
                """
            )

        if args.consultation_fee is not None:
            connection.execute(
                "UPDATE invoices SET consultationFee = ?",
                (args.consultation_fee,),
            )

        if args.medicine_cost is not None:
            connection.execute(
                "UPDATE invoices SET medicineCost = ?",
                (args.medicine_cost,),
            )

        # The server calculates tax and total from these three components.
        connection.execute(
            """
            UPDATE invoices
            SET tax = (consultationFee + treatmentCost + medicineCost) * ?,
                total = (consultationFee + treatmentCost + medicineCost) * (1 + ?)
            """,
            (args.tax_rate, args.tax_rate),
        )

    print("Costs updated successfully.")


def run_sql(connection, statement):
    cursor = connection.execute(statement)
    if cursor.description is None:
        connection.commit()
        print(f"Query executed. Rows changed: {cursor.rowcount}")
        return

    headers = [column[0] for column in cursor.description]
    print("\t".join(headers))
    for row in cursor.fetchall():
        print("\t".join(str(value) for value in row))


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database",
        default=DB_FILE,
        help=f"SQLite database path (default: {DB_FILE})",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("show-costs", help="Display all invoice and treatment costs")

    update_parser = subparsers.add_parser(
        "update-costs",
        help="Set costs on every matching row and recalculate invoices",
    )
    update_parser.add_argument("--treatment-cost", type=float)
    update_parser.add_argument("--consultation-fee", type=float)
    update_parser.add_argument("--medicine-cost", type=float)
    update_parser.add_argument(
        "--tax-rate",
        type=float,
        default=DEFAULT_TAX_RATE,
        help=f"Tax rate used for recalculation (default: {DEFAULT_TAX_RATE})",
    )

    sql_parser = subparsers.add_parser("sql", help="Run a read or write SQL statement")
    sql_parser.add_argument("statement", help="SQL statement to execute")
    return parser


def main():
    args = build_parser().parse_args()
    try:
        with connect_database(args.database) as connection:
            if args.command == "show-costs":
                show_costs(connection)
            elif args.command == "update-costs":
                update_costs(connection, args)
            elif args.command == "sql":
                run_sql(connection, args.statement)
    except (sqlite3.Error, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
