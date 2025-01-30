from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from .database import fetch_rooms, fetch_room_details
import logging
import os

# Default server URL if not found in environment variables
SERVER_URL = os.getenv("SERVER_URL", "https://backend-nodejs-main.up.railway.app/")

def generate_image_url(filename: str) -> str:
    """
    Generates a complete URL for an image given its filename.
    Ensures the URL starts with the correct base path and filename.
    """
    if not filename.startswith("room_img/"):
        filename = f"room_img/{filename}"
    return f"{SERVER_URL}{filename}"


class ActionSetDynamicRoomEntities(Action):
    def name(self) -> str:
        return "action_set_dynamic_room_entities"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        """
        Set dynamic entities for available rooms based on the current database data.
        This will allow the system to recognize room names automatically.
        """
        try:
            # Fetch rooms from the database
            rooms = fetch_rooms()
            
            # Check if rooms are available
            if rooms:
                room_names = [name for name, _, _ in rooms]  # Extracting room names only
                dynamic_entities = [{"value": name, "entity": "room_name"} for name in room_names]
                
                # Update the conversation with the dynamic entities
                dispatcher.utter_message(
                    text="Daftar ruangan telah diperbarui.",
                    json_message={"entities": dynamic_entities}
                )
            else:
                dispatcher.utter_message(text="Tidak ada ruangan yang tersedia untuk diperbarui.")
        except Exception as e:
            logging.error(f"Error setting dynamic room entities: {e}", exc_info=True)
            dispatcher.utter_message(text="Gagal memperbarui entitas ruangan.")
        return []

class ActionRetrieveRooms(Action):
    def name(self) -> str:
        return "action_retrieve_rooms"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            rooms = fetch_rooms()  # Ambil data ruangan
            print(f"Rooms fetched: {rooms}")  # Tambahkan log ini untuk memastikan data ada
            if rooms:
                response = "Berikut daftar ruangan yang tersedia:\n\n"
                for name, description, image_url in rooms:
                    # Generate image URL dynamically
                    full_image_url = generate_image_url(image_url)
                    # Format response dynamically
                    response += (
                        f"📍 <strong>{name}</strong><br>"
                        f"<img src='{full_image_url}' width='230' alt='Gambar'/><br>"
                        f"📝 {description}<br>\n\n"
                    )
                dispatcher.utter_message(text=response)
            else:
                dispatcher.utter_message(text="Maaf, tidak ada ruangan yang tersedia saat ini.")
        except Exception as e:
            logging.error(f"Failed to retrieve rooms: {e}", exc_info=True)
            dispatcher.utter_message(text="Terjadi kesalahan saat mengambil daftar ruangan.")
        return []
    def name(self) -> str:
        return "action_retrieve_rooms"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            rooms = fetch_rooms()  # Ambil data ruangan
            if rooms:
                response = "Berikut daftar ruangan yang tersedia:\n\n"
                for name, description, image_url in rooms:
                    # Generate image URL dynamically
                    full_image_url = generate_image_url(image_url)
                    # Format response dynamically
                    response += (
                        f"📍 <strong>{name}</strong><br>"
                        f"<img src='{full_image_url}' width='230' alt='Gambar'/><br>"
                        f"📝 {description}<br>\n\n"
                    )
                dispatcher.utter_message(text=response)
            else:
                dispatcher.utter_message(text="Maaf, tidak ada ruangan yang tersedia saat ini.")
        except Exception as e:
            logging.error(f"Failed to retrieve rooms: {e}", exc_info=True)
            dispatcher.utter_message(text="Terjadi kesalahan saat mengambil daftar ruangan.")
        return []

class ActionRetrieveRoomDetails(Action):
    def name(self) -> str:
        return "action_retrieve_room_details"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        # Ambil entitas 'room_name' dari percakapan
        room_name = next(tracker.get_latest_entity_values("room_name"), None)
        
        if not room_name:
            dispatcher.utter_message(text="Maaf, saya tidak mengerti ruangan yang Anda maksud. Silakan ulangi.")
            return []
        
        # Ambil detail ruangan dari database berdasarkan nama yang diberikan
        try:
            room_details = fetch_room_details(room_name)  # Pastikan fungsi ini memproses nama dengan benar
            if room_details:
                name, description, image_url = room_details
                full_image_url = generate_image_url(image_url)
                response = (
                    f"📌 Detail ruangan: <strong>{name}</strong><br>"
                    f"<img src='{full_image_url}' width='230' alt='Gambar'/><br>"
                    f"📝 {description}<br>"
                )
                dispatcher.utter_message(text=response)
            else:
                dispatcher.utter_message(text=f"Maaf, detail untuk ruangan '{room_name}' tidak ditemukan.")
        except Exception as e:
            logging.error(f"Error retrieving details for room '{room_name}': {e}", exc_info=True)
            dispatcher.utter_message(text="Terjadi kesalahan saat mengambil detail ruangan.")
        return []
