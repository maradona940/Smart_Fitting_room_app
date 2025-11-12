# smart_fitting_room_ai/main.py
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from datetime import datetime
import os
from decouple import config # For environment variables

# Import classes from our src modules
from src.ai_modules import DurationPredictor, TrendingItemsAnalyzer, PeakTimePredictor, AnomalyDetector
from src.embedding_model import ItemEmbeddingModel
from src.utils import load_item_database, load_historical_sessions, load_anomaly_training_data

app = FastAPI(title="Smart Fitting Room AI Service")

# Global variables to hold loaded models and data
item_database = {}
embedding_model: Optional[ItemEmbeddingModel] = None
duration_predictor: Optional[DurationPredictor] = None
trending_analyzer: Optional[TrendingItemsAnalyzer] = None
peak_predictor: Optional[PeakTimePredictor] = None
anomaly_detector: Optional[AnomalyDetector] = None
historical_sessions_for_analytics = None # Raw df for trending/peak

# --- Pydantic Models for API Requests ---
class SessionRequest(BaseModel):
    room_id: str
    card_id: str
    item_ids: List[str]
    entry_time: str # ISO format string

class SessionComplete(BaseModel):
    room_id: str
    card_id: str
    item_ids: List[str]
    entry_time: str # ISO format string
    exit_time: str  # ISO format string
    entry_scans: List[str]
    exit_scans: List[str]

# --- Startup Event to Load Models ---
@app.on_event("startup")
async def startup_event():
    global item_database, embedding_model, duration_predictor, trending_analyzer, \
           peak_predictor, anomaly_detector, historical_sessions_for_analytics

    print("--- Starting up Smart Fitting Room AI Service ---")

    # Load item database
    try:
        item_database = load_item_database()
        print(f"Loaded {len(item_database)} items into item_database.")
    except FileNotFoundError as e:
        print(f"ERROR: {e}. Please run simulate_data.py and train.py first.")
        # Exit or raise error, depending on desired robustness
        raise HTTPException(status_code=500, detail=str(e))

    # Load historical sessions for analytics (Trending/Peak)
    try:
        historical_sessions_for_analytics = load_historical_sessions()
        print(f"Loaded {len(historical_sessions_for_analytics)} historical sessions for analytics.")
    except FileNotFoundError as e:
        print(f"ERROR: {e}. Please run simulate_data.py and train.py first.")
        raise HTTPException(status_code=500, detail=str(e))

    # Load Embedding Model
    try:
        embedding_model = ItemEmbeddingModel.load('src/models/embedding_model_config.json')
        print("ItemEmbeddingModel loaded.")
    except FileNotFoundError as e:
        print(f"ERROR: {e}. Please run train.py to generate models.")
        raise HTTPException(status_code=500, detail=str(e))

    # Load Duration Predictor
    try:
        duration_predictor = DurationPredictor.load('src/models', item_database, embedding_model)
        print("DurationPredictor loaded.")
    except Exception as e:
        print(f"ERROR loading DurationPredictor: {e}. Please run train.py.")
        raise HTTPException(status_code=500, detail=f"Failed to load DurationPredictor: {e}")

    # Initialize Trending Items Analyzer (no explicit load, uses raw data)
    trending_analyzer = TrendingItemsAnalyzer(historical_sessions_for_analytics, item_database)
    print("TrendingItemsAnalyzer initialized.")

    # Load Peak Time Predictor
    try:
        peak_predictor = PeakTimePredictor.load('src/models', historical_sessions_for_analytics)
        print("PeakTimePredictor loaded.")
    except Exception as e:
        print(f"ERROR loading PeakTimePredictor: {e}. Please run train.py.")
        raise HTTPException(status_code=500, detail=f"Failed to load PeakTimePredictor: {e}")

    # Load Anomaly Detector
    try:
        anomaly_detector = AnomalyDetector.load('src/models', item_database)
        print("AnomalyDetector loaded.")
    except Exception as e:
        print(f"ERROR loading AnomalyDetector: {e}. Please run train.py.")
        raise HTTPException(status_code=500, detail=f"Failed to load AnomalyDetector: {e}")

    print("--- Smart Fitting Room AI Service Ready ---")


# --- API Endpoints ---

@app.post("/predict/duration")
async def predict_duration_endpoint(request: SessionRequest):
    """Predict expected fitting room duration."""
    if not duration_predictor:
        raise HTTPException(status_code=503, detail="Duration prediction model not loaded.")
    try:
        entry_dt = pd.to_datetime(request.entry_time)
        prediction = duration_predictor.predict(
            request.item_ids,
            entry_dt
        )

        return {
            "room_id": request.room_id,
            "predicted_duration_minutes": prediction['predicted_duration'],
            "confidence_interval": prediction['confidence_interval'],
            "confidence_score": prediction['confidence_score']
        }
    except Exception as e:
        print(f"Error in /predict/duration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/check/overstay")
async def check_overstay_endpoint(request: SessionRequest):
    """Check if customer is currently overstaying."""
    if not duration_predictor:
        raise HTTPException(status_code=503, detail="Duration prediction model not loaded.")
    try:
        entry_dt = pd.to_datetime(request.entry_time)
        current_dt = pd.Timestamp.now()

        result = duration_predictor.check_overstay(
            request.item_ids,
            entry_dt,
            current_dt
        )

        if result['is_overstay']:
            return {
                "alert": True,
                "room_id": request.room_id,
                "severity": result['severity'],
                "expected_duration": result['expected_duration'],
                "actual_duration": result['actual_duration'],
                "excess_minutes": result['excess_minutes'],
                "message": f"Customer exceeded recommended time limit by {result['excess_minutes']} minutes"
            }

        return {"alert": False, "room_id": request.room_id}

    except Exception as e:
        print(f"Error in /check/overstay: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/anomaly")
async def detect_anomaly_endpoint(request: SessionComplete):
    """Detect suspicious behavior in completed session."""
    if not anomaly_detector or not duration_predictor or not peak_predictor:
        raise HTTPException(status_code=503, detail="Anomaly detection or dependent models not loaded.")
    try:
        entry_dt = pd.to_datetime(request.entry_time)
        exit_dt = pd.to_datetime(request.exit_time)
        duration = (exit_dt - entry_dt).total_seconds() / 60

        # Get predicted duration from the DurationPredictor
        predicted_duration_for_anomaly = duration_predictor.predict(
            request.item_ids, entry_dt
        )['predicted_duration']

        # Get peak status from PeakTimePredictor
        current_peak_status = peak_predictor.get_current_status()

        # Prepare session data for anomaly detector
        session_data_for_anomaly = {
            'predicted_duration': predicted_duration_for_anomaly,
            'actual_duration': duration,
            'entry_scans': request.entry_scans,
            'exit_scans': request.exit_scans,
            'entry_time': request.entry_time, # Pass as string for consistency with mock data
            'exit_time': request.exit_time,
            'hour': entry_dt.hour,
            'is_peak': current_peak_status['is_peak_time']
        }

        anomaly_result = anomaly_detector.detect(session_data_for_anomaly)

        if anomaly_result['is_anomaly']:
            return {
                "alert": True,
                "room_id": request.room_id,
                "anomaly_score": anomaly_result['anomaly_score'],
                "risk_level": anomaly_result['risk_level'],
                "message": "Suspicious behavior pattern detected",
                "model_decision_score": anomaly_result['model_decision_score']
            }

        return {"alert": False, "room_id": request.room_id}

    except Exception as e:
        print(f"Error in /detect/anomaly: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/trending-items")
async def get_trending_items_endpoint(time_window: str = "7d", top_n: int = 10):
    """Get trending items analysis."""
    if not trending_analyzer:
        raise HTTPException(status_code=503, detail="Trending items analyzer not loaded.")
    try:
        trending = trending_analyzer.get_trending_items(time_window, top_n)
        return {
            "time_window": time_window,
            "trending_items": trending
        }
    except Exception as e:
        print(f"Error in /analytics/trending-items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/peak-times")
async def get_peak_times_endpoint(days_ahead: int = 7):
    """Predict peak shopping times."""
    if not peak_predictor:
        raise HTTPException(status_code=503, detail="Peak time predictor not loaded.")
    try:
        peaks_df = peak_predictor.predict_peak_times(days_ahead)
        current = peak_predictor.get_current_status()

        return {
            "current_status": current,
            "predicted_peaks": peaks_df.to_dict('records') # Convert DataFrame to list of dicts
        }
    except Exception as e:
        print(f"Error in /analytics/peak-times: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/item-combinations")
async def get_popular_combinations_endpoint(min_support: int = 5, top_n: int = 10):
    """Get frequently tried-together items."""
    if not trending_analyzer:
        raise HTTPException(status_code=503, detail="Trending items analyzer not loaded.")
    try:
        combos = trending_analyzer.get_combination_insights(min_support, top_n)
        return {"popular_combinations": combos}
    except Exception as e:
        print(f"Error in /analytics/item-combinations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "models_loaded": {
            "duration_predictor": duration_predictor is not None,
            "trending_analyzer": trending_analyzer is not None,
            "peak_predictor": peak_predictor is not None,
            "anomaly_detector": anomaly_detector is not None,
            "item_database": item_database is not None and len(item_database) > 0,
            "embedding_model": embedding_model is not None
        }
    }

if __name__ == "__main__":
    import uvicorn
    # Use environment variables for host/port or default
    HOST = config('API_HOST', default='0.0.0.0')
    PORT = config('API_PORT', default=8000, cast=int)
    uvicorn.run(app, host=HOST, port=PORT)
