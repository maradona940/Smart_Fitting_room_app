from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import json
import os
import pandas as pd
import uvicorn
import random
import uuid

from models import DurationPredictor, AnomalyDetector
from db_integration import load_item_database_from_db, load_historical_sessions_from_db, save_session_to_db

# --- Updated Room Management Component ---

class RoomManager:
    """
    Manages the state of fitting rooms with intelligent assignment.
    """
    def __init__(self, total_rooms: int = 2): # CHANGED: total_rooms from 6 to 2
        self.total_rooms = total_rooms
        self.rooms = {f"room_{i+1}": {"status": "available", "session_id": None, "entry_time": None, "predicted_duration": None} for i in range(total_rooms)}
        print(f"✓ RoomManager initialized for {total_rooms} rooms.")

    def _get_expected_release_time(self, room_data: dict) -> datetime:
        """Calculates when an occupied room is expected to be free."""
        if room_data['status'] == 'occupied' and room_data['entry_time'] and room_data['predicted_duration']:
            return room_data['entry_time'] + timedelta(minutes=room_data['predicted_duration'])
        return datetime.now() # If available, it's free now

    def assign_room_intelligently(self, session_id: str, new_session_duration: float) -> dict:
        """
        Assigns a room using a 'Best Fit' strategy to minimize the new session's end time.
        """
        best_option = {
            "room_id": None,
            "final_end_time": datetime.max, # Initialize with a very late time
            "wait_time_minutes": float('inf'),
            "is_immediate": False
        }

        now = datetime.now()

        for room_id, data in self.rooms.items():
            expected_release_time = self._get_expected_release_time(data)

            # Start time for the new session is either now (if room is free) or when it becomes free.
            start_time = max(now, expected_release_time)

            end_time = start_time + timedelta(minutes=new_session_duration)

            if end_time < best_option["final_end_time"]:
                best_option["room_id"] = room_id
                best_option["final_end_time"] = end_time
                best_option["wait_time_minutes"] = max(0, (expected_release_time - now).total_seconds() / 60)

        # A room will always be found, but we need to check if the assignment is immediate.
        if best_option["room_id"]:
            is_immediate = best_option["wait_time_minutes"] < 0.1 # Small tolerance for immediate

            # If the best option is to wait for an occupied room, but there IS an empty one,
            # we should double-check if taking the empty one is better. The logic already handles this by finding the minimum end_time.

            # Formally assign the room if the assignment is immediate
            if is_immediate:
                self.rooms[best_option["room_id"]] = {
                    "status": "occupied",
                    "session_id": session_id,
                    "entry_time": now,
                    "predicted_duration": new_session_duration
                }
                print(f"  [RoomManager] Intelligently assigned {best_option['room_id']} to session {session_id} (Immediate)")
            else:
                # In a real system, you'd place this in a queue. For now, we'll just inform the user.
                print(f"  [RoomManager] Best option for session {session_id} is to wait for {best_option['room_id']}")

            return {
                "assigned_room_id": best_option["room_id"],
                "wait_time_minutes": round(best_option["wait_time_minutes"], 2),
                "is_immediate": is_immediate
            }

        return {} # Should not happen

    def release_room(self, room_id: str) -> bool:
        if room_id not in self.rooms:
            print(f"  [RoomManager] Error: Attempted to release non-existent room {room_id}")
            return False
        if self.rooms[room_id]["status"] == "available":
            print(f"  [RoomManager] Warning: Room {room_id} was already available.")

        self.rooms[room_id] = {"status": "available", "session_id": None, "entry_time": None, "predicted_duration": None}
        print(f"  [RoomManager] Released {room_id}. It is now available.")
        return True

    def get_status(self) -> dict:
        return self.rooms

# --- App Initialization, Analytics Helpers, etc. (No Changes) ---
app = FastAPI(
    title="Smart Fitting Room AI/ML API",
    description="API for duration prediction, anomaly detection, business analytics, and intelligent room assignment."
)
# ... (SimplePeakTimePredictor and SimpleDailyStatsCalculator are unchanged) ...

# --- Global Variables ---
duration_model: DurationPredictor = None
anomaly_model: AnomalyDetector = None
item_database: dict = {}
# Removed peak_predictor and daily_stats_calculator
room_manager: RoomManager = None

# --- Pydantic Models ---
class AssignRoomRequest(BaseModel):
    item_ids: list[str]

class AssignRoomResponse(BaseModel): # CHANGED: More informative response
    status: str # "assigned", "wait"
    message: str
    assigned_room_id: str | None = None
    session_id: str | None = None
    predicted_duration_minutes: float | None = None
    estimated_wait_minutes: float = 0.0

# ... (Other Pydantic models are unchanged) ...
class PredictDurationRequest(BaseModel):
    item_ids: list[str]
    entry_time: datetime
class PredictDurationResponse(BaseModel):
    predicted_duration_minutes: float
class DetectAnomalyRequest(BaseModel):
    session_id: str
    room_id: str
    actual_duration: float
    predicted_duration: float
    entry_scans: list[str]
    exit_scans: list[str]
    entry_time: datetime
class AnomalyDetectionResponse(BaseModel):
    session_id: str
    is_anomaly: bool
    anomaly_score: float
    risk_level: str

# --- API Lifecycle Events ---
@app.on_event("startup")
async def startup_event():

    global duration_model, anomaly_model, item_database, room_manager
    print("API Startup: Loading models and data from database...")
    room_manager = RoomManager(total_rooms=2)
    
    # Load item database from PostgreSQL database
    try:
        item_database = load_item_database_from_db()
        print(f"✓ Loaded {len(item_database)} items from database.")
    except Exception as e:
        print(f"⚠ Error loading from database: {e}")
        print("⚠ Falling back to JSON file...")
        item_db_path = 'data/item_database.json'
        if os.path.exists(item_db_path):
            with open(item_db_path, 'r') as f:
                item_database = json.load(f)
            print(f"✓ Loaded {len(item_database)} items from JSON file.")
        else:
            raise RuntimeError(f"Item database not found in database or JSON file. Please ensure database is set up.")
    
    try:
        duration_model = DurationPredictor.load()
    except FileNotFoundError:
        raise RuntimeError("Duration model not found. Run train.py first.")
    try:
        anomaly_model = AnomalyDetector.load()
    except FileNotFoundError:
        raise RuntimeError("Anomaly model not found. Run train.py first.")
    
    # Load historical sessions from database (optional, for analytics)
    try:
        sessions_df = load_historical_sessions_from_db()
        print(f"✓ Loaded {len(sessions_df)} historical sessions from database.")
    except Exception as e:
        print(f"⚠ Warning: Could not load historical sessions from database: {e}")
        print("⚠ Analytics will be limited.")
        sessions_df = pd.DataFrame(columns=['session_id', 'entry_time', 'exit_time', 'item_ids', 'entry_scans', 'exit_scans', 'duration'])

    print("API Startup complete.")


# --- Endpoints ---
@app.get("/")
async def read_root():
    return {"message": "Welcome to the Smart Fitting Room AI/ML API. Visit /docs for API documentation."}

@app.post("/assign_room", response_model=AssignRoomResponse)
async def assign_room_endpoint(request: AssignRoomRequest):
    """
    Intelligently assigns a fitting room to minimize wait times and maximize throughput.
    """
    if not duration_model or not room_manager:
        raise HTTPException(status_code=503, detail="Duration model or Room Manager not initialized.")

    # 1. Predict duration
    try:
        features = duration_model.extract_features(request.item_ids, item_database, datetime.now())
        predicted_duration = duration_model.predict(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting duration for assignment: {e}")

    # 2. Generate a session ID
    session_id = str(uuid.uuid4())

    # 3. Get the best room assignment option
    assignment = room_manager.assign_room_intelligently(session_id, predicted_duration)

    if assignment["is_immediate"]:
        return AssignRoomResponse(
            status="assigned",
            message=f"Please proceed to {assignment['assigned_room_id']}.",
            assigned_room_id=assignment['assigned_room_id'],
            session_id=session_id,
            predicted_duration_minutes=round(float(predicted_duration), 2),
            estimated_wait_minutes=0.0
        )
    else:
        wait_minutes = assignment['wait_time_minutes']
        return AssignRoomResponse(
            status="wait",
            message=f"All rooms are occupied. The best option is {assignment['assigned_room_id']}, available in approximately {wait_minutes:.1f} minutes.",
            assigned_room_id=assignment['assigned_room_id'], # We still provide the target room
            session_id=session_id,
            predicted_duration_minutes=round(float(predicted_duration), 2),
            estimated_wait_minutes=wait_minutes
        )


@app.get("/rooms/status")
async def get_room_status_endpoint():
    """Returns the current status of all fitting rooms."""
    if not room_manager:
        raise HTTPException(status_code=503, detail="Room Manager not initialized.")
    return room_manager.get_status()
@app.post("/predict_duration", response_model=PredictDurationResponse)
async def predict_duration_endpoint(request: PredictDurationRequest):
    """
    Predicts the expected duration (in minutes) for a fitting room session
    based on the items taken and entry time. This prediction is crucial for anomaly detection.
    """
    if not duration_model or not duration_model.is_trained:
        raise HTTPException(status_code=503, detail="Duration model not loaded or trained.")
    if not request.item_ids:
        return PredictDurationResponse(predicted_duration_minutes=5.0)
    try:
        features = duration_model.extract_features(
            request.item_ids,
            item_database,
            request.entry_time
        )
        predicted_duration = duration_model.predict(features)
        return PredictDurationResponse(predicted_duration_minutes=round(float(predicted_duration), 2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting duration: {e}")
@app.post("/detect_anomaly", response_model=AnomalyDetectionResponse)
async def detect_anomaly_endpoint(request: DetectAnomalyRequest):
    """
    Detects anomalies in a completed session and releases the fitting room.
    This is the core security endpoint, identifying potential theft indicators.
    Upon completion, the associated room_id is made available again.
    Saves session data to database for AI training.
    """
    if not anomaly_model or not room_manager:
        raise HTTPException(status_code=503, detail="Anomaly model or Room Manager not loaded.")
    try:
        session_data = request.dict()
        features = anomaly_model.extract_features(session_data)
        result = anomaly_model.predict_with_score(features)
        
        # Calculate exit time
        entry_time = request.entry_time
        if isinstance(entry_time, str):
            entry_time = datetime.fromisoformat(entry_time.replace('Z', '+00:00'))
        exit_time = entry_time + timedelta(minutes=request.actual_duration)
        
        # Save session to database for training
        try:
            # Extract room_id number from room_id string (e.g., "room_1" -> 1)
            room_id_num = None
            if request.room_id:
                try:
                    room_id_num = int(request.room_id.split('_')[-1])
                except:
                    pass
            
            save_session_to_db(
                session_id=request.session_id,
                room_id=room_id_num,
                customer_rfid=None,  # Can be extracted from request if available
                entry_time=entry_time,
                exit_time=exit_time,
                item_ids=request.entry_scans,  # All items entered
                entry_scans=request.entry_scans,
                exit_scans=request.exit_scans,
                predicted_duration=request.predicted_duration,
                is_anomaly=result['is_anomaly'],
                anomaly_score=result['anomaly_score'],
                risk_level=result['risk_level']
            )
        except Exception as db_error:
            print(f"⚠ Warning: Could not save session to database: {db_error}")
            # Continue even if database save fails
        
        room_manager.release_room(request.room_id)
        return AnomalyDetectionResponse(
            session_id=request.session_id,
            is_anomaly=result['is_anomaly'],
            anomaly_score=result['anomaly_score'],
            risk_level=result['risk_level']
        )
    except Exception as e:
        room_manager.release_room(request.room_id)
        raise HTTPException(status_code=500, detail=f"Error detecting anomaly: {e}. Room has been force-released.")
