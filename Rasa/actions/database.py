import mysql.connector
import os
from mysql.connector import Error

def get_db_connection():
    # Mengakses environment variables langsung dari Railway
    db_host = os.getenv('DB_HOST')
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    db_name = os.getenv('DB_NAME')

    # Koneksi ke database MySQL menggunakan variabel dari environment
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
        query = "SELECT name, description, imageUrl FROM rooms"  # Menambahkan imageUrl dalam query
        cursor.execute(query)
        rooms = cursor.fetchall()  # Mengambil data dalam bentuk list of tuples
        return rooms  # Mengembalikan data ruangan
    except Exception as e:
        print(f"Error fetching rooms: {e}")
        return []  # Mengembalikan list kosong jika terjadi error
    finally:
        # Menutup cursor dan koneksi
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def fetch_room_details(room_name: str):
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        query = "SELECT name, description, imageUrl FROM rooms WHERE name = %s"
        cursor.execute(query, (room_name,))
        room_details = cursor.fetchone()  # Mengambil satu baris data
        return room_details  # Mengembalikan data ruangan
    except Error as e:
        print(f"Error: {e}")
        return None  # Mengembalikan None jika terjadi error
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
