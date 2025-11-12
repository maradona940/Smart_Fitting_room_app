import requests
import json
from datetime import datetime, timedelta
import random
import time

API_BASE_URL = "http://localhost:8000"

def get_mock_item_db():
    """Helper to get item IDs for simulation."""
    try:
        with open('data/item_database.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: data/item_database.json not found. Run simulate_data.py first.")
        return {}

def test_predict_duration():
    print("\n--- Testing Duration Prediction ---")
    item_db = get_mock_item_db()
    if not item_db: return

    sample_item_ids = random.sample(list(item_db.keys()), k=random.randint(1, 5))
    entry_time = datetime.now() - timedelta(minutes=random.randint(5, 60)) # Simulate a recent entry

    payload = {
        "item_ids": sample_item_ids,
        "entry_time": entry_time.isoformat()
    }
    print(f"Requesting duration for items: {[item_db[i]['name'] for i in sample_item_ids]} at {entry_time.strftime('%H:%M')}")

    try:
        response = requests.post(f"{API_BASE_URL}/predict_duration", json=payload)
        response.raise_for_status()
        result = response.json()
        print(f"Predicted Duration: {result['predicted_duration_minutes']:.2f} minutes")
    except requests.exceptions.RequestException as e:
        print(f"Error predicting duration: {e}")

def test_detect_anomaly():
    print("\n--- Testing Anomaly Detection ---")
    item_db = get_mock_item_db()
    if not item_db: return

    session_id = f"test_sess_{random.randint(10000, 99999)}"
    entry_time = datetime.now() - timedelta(minutes=random.randint(10, 40))

    # Simulate a normal session first to get a predicted duration
    normal_item_ids = random.sample(list(item_db.keys()), k=random.randint(1, 3))
    duration_payload = {
        "item_ids": normal_item_ids,
        "entry_time": entry_time.isoformat()
    }
    predicted_duration = 15.0 # Default if prediction fails
    try:
        duration_response = requests.post(f"{API_BASE_URL}/predict_duration", json=duration_payload)
        duration_response.raise_for_status()
        predicted_duration = duration_response.json()['predicted_duration_minutes']
        print(f"Predicted duration for normal session: {predicted_duration:.2f} min")
    except requests.exceptions.RequestException as e:
        print(f"Warning: Could not get predicted duration for anomaly test, using default. Error: {e}")

    # --- Scenario 1: Normal Session ---
    print("\n  Scenario 1: Normal Session (actual_duration ~ predicted_duration, no missing items)")
    actual_duration_normal = predicted_duration * random.uniform(0.9, 1.1)
    anomaly_payload_normal = {
        "session_id": session_id + "_normal",
        "room_id": "room_1", # Dummy room_id for testing anomaly logic
        "actual_duration": actual_duration_normal,
        "predicted_duration": predicted_duration,
        "entry_scans": normal_item_ids,
        "exit_scans": normal_item_ids,
        "entry_time": entry_time.isoformat()
    }
    try:
        response = requests.post(f"{API_BASE_URL}/detect_anomaly", json=anomaly_payload_normal)
        response.raise_for_status()
        result = response.json()
        print(f"  Result (Normal): Is Anomaly: {result['is_anomaly']}, Score: {result['anomaly_score']:.3f}, Risk: {result['risk_level']}")
    except requests.exceptions.RequestException as e:
        print(f"  Error detecting anomaly (Normal): {e}")

    # --- Scenario 2: Overstay Anomaly ---
    print("\n  Scenario 2: Overstay Anomaly (actual_duration >> predicted_duration)")
    overstay_item_ids = random.sample(list(item_db.keys()), k=random.randint(1, 3))
    duration_payload_overstay = {
        "item_ids": overstay_item_ids,
        "entry_time": entry_time.isoformat()
    }
    predicted_duration_overstay = 15.0
    try:
        duration_response = requests.post(f"{API_BASE_URL}/predict_duration", json=duration_payload_overstay)
        duration_response.raise_for_status()
        predicted_duration_overstay = duration_response.json()['predicted_duration_minutes']
        print(f"  Predicted duration for overstay session: {predicted_duration_overstay:.2f} min")
    except requests.exceptions.RequestException as e:
        print(f"  Warning: Could not get predicted duration for overstay test, using default. Error: {e}")

    actual_duration_overstay = predicted_duration_overstay * random.uniform(2.5, 3.5) # Significantly longer
    anomaly_payload_overstay = {
        "session_id": session_id + "_overstay",
        "room_id": "room_2", # Dummy room_id for testing anomaly logic
        "actual_duration": actual_duration_overstay,
        "predicted_duration": predicted_duration_overstay,
        "entry_scans": overstay_item_ids,
        "exit_scans": overstay_item_ids,
        "entry_time": entry_time.isoformat()
    }
    try:
        response = requests.post(f"{API_BASE_URL}/detect_anomaly", json=anomaly_payload_overstay)
        response.raise_for_status()
        result = response.json()
        print(f"  Result (Overstay): Is Anomaly: {result['is_anomaly']}, Score: {result['anomaly_score']:.3f}, Risk: {result['risk_level']}")
    except requests.exceptions.RequestException as e:
        print(f"  Error detecting anomaly (Overstay): {e}")

    # --- Scenario 3: Missing Items Anomaly ---
    print("\n  Scenario 3: Missing Items Anomaly")
    missing_item_ids_entry = random.sample(list(item_db.keys()), k=random.randint(3, 5))
    if len(missing_item_ids_entry) < 2: # Ensure at least 2 items to make one missing
        missing_item_ids_entry.extend(random.sample(list(item_db.keys()), k=2-len(missing_item_ids_entry)))

    missing_item_ids_exit = random.sample(missing_item_ids_entry, k=len(missing_item_ids_entry) - 1) # One item missing

    duration_payload_missing = {
        "item_ids": missing_item_ids_entry,
        "entry_time": entry_time.isoformat()
    }
    predicted_duration_missing = 15.0
    try:
        duration_response = requests.post(f"{API_BASE_URL}/predict_duration", json=duration_payload_missing)
        duration_response.raise_for_status()
        predicted_duration_missing = duration_response.json()['predicted_duration_minutes']
        print(f"  Predicted duration for missing items session: {predicted_duration_missing:.2f} min")
    except requests.exceptions.RequestException as e:
        print(f"  Warning: Could not get predicted duration for missing items test, using default. Error: {e}")

    actual_duration_missing = predicted_duration_missing * random.uniform(0.9, 1.1) # Normal duration
    anomaly_payload_missing = {
        "session_id": session_id + "_missing",
        "room_id": "room_3", # Dummy room_id for testing anomaly logic
        "actual_duration": actual_duration_missing,
        "predicted_duration": predicted_duration_missing,
        "entry_scans": missing_item_ids_entry,
        "exit_scans": missing_item_ids_exit,
        "entry_time": entry_time.isoformat()
    }
    try:
        response = requests.post(f"{API_BASE_URL}/detect_anomaly", json=anomaly_payload_missing)
        response.raise_for_status()
        result = response.json()
        print(f"  Result (Missing): Is Anomaly: {result['is_anomaly']}, Score: {result['anomaly_score']:.3f}, Risk: {result['risk_level']}")
    except requests.exceptions.RequestException as e:
        print(f"  Error detecting anomaly (Missing): {e}")


if __name__ == "__main__":
    print("Starting integration tests...")
    print(f"Ensuring API is running at {API_BASE_URL}...")
    try:
        requests.get(API_BASE_URL).raise_for_status()
        print("API is reachable.")
    except requests.exceptions.ConnectionError:
        print(f"Error: API is not running at {API_BASE_URL}. Please start the API first (uvicorn api:app --reload).")
        exit(1)
    except requests.exceptions.RequestException as e:
        print(f"Error checking API status: {e}")
        exit(1)

    test_predict_duration()
    time.sleep(1) # Small delay
    test_detect_anomaly()
    time.sleep(1)

    print("\nIntegration tests completed.")
