import mysql.connector
import os
from mysql.connector import Error
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    # Mengakses environment variables langsung dari Railway
    db_host = os.getenv('MYSQLHOST')
    db_user = os.getenv('MYSQLUSER')
    db_password = os.getenv('MYSQLPASSWORD')
    db_name = os.getenv('MYSQLDATABASE')

    try:
        # Koneksi ke database MySQL menggunakan variabel dari environment
        connection = mysql.connector.connect(
            host=db_host,
            user=db_user,
            password=db_password,
            database=db_name
        )
        return connection
    except Error as e:
        print(f"Error connecting to database: {e}")
        return None

def fetch_rooms():
    cursor = None
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return []  # Mengembalikan list kosong jika koneksi gagal

        cursor = conn.cursor()
        query = "SELECT name, description, imageUrl FROM rooms"
        cursor.execute(query)
        rooms = cursor.fetchall()  # Mengambil data dalam bentuk list of tuples
        print(f"Fetched rooms: {rooms}")  # Log data ruangan yang didapat
        return rooms  # Mengembalikan data ruangan
    except Exception as e:
        print(f"Error fetching rooms: {e}")
        return []  # Mengembalikan list kosong jika terjadi error
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def fetch_room_details(room_name: str):
    cursor = None
    connection = None
    try:
        connection = get_db_connection()
        if connection is None:
            return None  # Kembalikan None jika koneksi gagal

        cursor = connection.cursor()
        query = "SELECT name, description, imageUrl FROM rooms WHERE name = %s"
        cursor.execute(query, (room_name,))
        room_details = cursor.fetchone()  # Mengambil satu baris data

        if room_details:
            return room_details  # Mengembalikan detail ruangan
        else:
            return None  # Jika ruangan tidak ditemukan
    except Error as e:
        print(f"Error fetching room details: {e}")
        return None  # Mengembalikan None jika terjadi error
    finally:
        # Pastikan cursor dan koneksi ditutup dengan baik
        if cursor:
            cursor.close()
        if connection:
            connection.close()
