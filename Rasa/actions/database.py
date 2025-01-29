import mysql.connector
import os
from dotenv import load_dotenv
from mysql.connector import Error

# Load environment variables from the .env file located outside of the Rasa directory
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', '.env')
load_dotenv(dotenv_path)

def get_db_connection():
    # Load variables from the environment
    db_host = os.getenv('DB_HOST')
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_name = os.getenv('DB_NAME')

    # Connect to MySQL database using variables from .env
    connection = mysql.connector.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name
    )
    return connection

def fetch_rooms():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "SELECT name, description, imageUrl FROM rooms"  # Include imageUrl in the query
        cursor.execute(query)
        rooms = cursor.fetchall()  # Returns a list of tuples
        return rooms  # Return fetched room data
    except Exception as e:
        print(f"Error fetching rooms: {e}")
        return []  # Return an empty list on error
    finally:
        # Ensure resources are cleaned up
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def fetch_room_details(room_name: str):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        # Prepare the query to fetch room details
        query = "SELECT name, description, imageUrl FROM rooms WHERE name = %s"
        cursor.execute(query, (room_name,))
        room_details = cursor.fetchone()  # Fetch one row
        return room_details  # Returns a tuple (name, description, imageUrl)
    except Error as e:
        print(f"Error: {e}")
        return None  # Return None if there was an error
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
