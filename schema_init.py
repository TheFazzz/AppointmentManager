#!/usr/bin/env python3
import argparse
import sqlite3
import os
import sys

parser = argparse.ArgumentParser(
    prog="schema_init.py",
    description="Initialize the SQLite database schema"
)
parser.add_argument("-i", "--input", help="Input schema file", default="schema.sql")
parser.add_argument("-f", "--file", help="SQLite database file", default="database.db")

args = parser.parse_args()

try:
    with open(args.input, "r") as schema_sql_file:
        schema_sql = schema_sql_file.read()

    with open(args.input.replace(".sql", "_testdata.sql"), "r") as schema_testdata_sql_file:
        schema_testdata_sql = schema_testdata_sql_file.read()
except FileNotFoundError:
    print("Error: File not found. Check the file names and try again.")
    sys.exit(1)

if os.path.isfile(args.file):
    answer = input("Database file already exists. Overwrite? (y/n) ")
    if answer.lower() == "y":
        os.remove(args.file)
    else:
        print("Aborting...")
        sys.exit(1)

conn = sqlite3.connect(args.file)
c = conn.cursor()

try:
    c.executescript(schema_sql)
    print("Database schema initialized successfully.")

    insertTestData = input("Insert test data? (y/n) ")
    if insertTestData.lower() == "y":
        c.executescript(schema_testdata_sql)
        print("Test data inserted successfully.")
except sqlite3.Error as e:
    print(f"An error occurred: {e}")
    sys.exit(1)
finally:
    conn.commit()
    conn.close()
