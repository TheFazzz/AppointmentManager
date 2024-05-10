import sqlite3

# Connect to the database
conn = sqlite3.connect('C:/CPSC431/AppointmentManager/database.db')

# Create a cursor object
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
