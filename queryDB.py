import sqlite3
# If you want to run any queries to test out  the database you may use this script
# Once you put your SQL query in, to run just type command "python queryDB.py"
# Python comes with Sqlite, so this is easier for you to test than having to download Sqlite

conn = sqlite3.connect('C:/CPSC431/AppointmentManager/database.db')


cursor = conn.cursor()

# Execute a query
# Add custom querys in here to test
cursor.execute("SELECT * FROM users")

# Fetch the results
results = cursor.fetchall()

# Print the results
for result in results:
    print(result)


conn.close()
