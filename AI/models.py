import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib
import os


class DurationPredictor:
    """
    Predicts fitting room duration using Random Forest.
    Simple but effective feature engineering.
    """

    def __init__(self):
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('rf', RandomForestRegressor(
                n_estimators=50,
                max_depth=10,
                min_samples_split=5,
                random_state=42
            ))
        ])
        self.is_trained = False

    def extract_features(self, item_ids, item_db, entry_time):
        """
        Extract features from items and temporal data.
        Returns: numpy array of shape (1, n_features)
        """
        items = [item_db.get(id, {}) for id in item_ids]

        # Item-level features
        num_items = len(items)
        avg_price = np.mean([i.get('price', 0) for i in items]) if items else 0
        max_price = np.max([i.get('price', 0) for i in items]) if items else 0
        avg_complexity = np.mean([i.get('complexity_score', 0) for i in items]) if items else 0
        max_complexity = np.max([i.get('complexity_score', 0) for i in items]) if items else 0

        # Category counts
        num_jackets = sum(1 for i in items if i.get('category') == 'Jacket')
        num_pants = sum(1 for i in items if i.get('category') == 'Pants')
        num_dresses = sum(1 for i in items if i.get('category') == 'Dress')

        # Boolean features
        has_zipper = int(any(i.get('has_zipper', False) for i in items))
        has_buttons = int(any(i.get('has_buttons', False) for i in items))

        # Temporal features
        # Ensure entry_time is a datetime object
        if isinstance(entry_time, str):
            entry_time = pd.to_datetime(entry_time)

        # Convert pandas Timestamp to datetime if needed
        if hasattr(entry_time, 'to_pydatetime'):
            entry_time = entry_time.to_pydatetime()

        hour = entry_time.hour
        day_of_week = entry_time.weekday()  # Changed from dayofweek to weekday()
        is_weekend = int(entry_time.weekday() >= 5)  # Changed from dayofweek to weekday()
        is_evening = int(17 <= entry_time.hour <= 20)

        features = np.array([
            num_items, avg_price, max_price, avg_complexity, max_complexity,
            num_jackets, num_pants, num_dresses,
            has_zipper, has_buttons,
            hour, day_of_week, is_weekend, is_evening
        ]).reshape(1, -1)

        return features

    def train(self, X, y):
        """Train the model"""
        self.model.fit(X, y)
        self.is_trained = True
        return self

    def predict(self, X):
        """Predict duration in minutes"""
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        return self.model.predict(X)[0]

    def save(self, path='models/duration_model.pkl'):
        """Save trained model"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.model, path)
        print(f"✓ Duration model saved to {path}")

    @classmethod
    def load(cls, path='models/duration_model.pkl'):
        """Load trained model"""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model not found at {path}. Train first!")
        instance = cls()
        instance.model = joblib.load(path)
        instance.is_trained = True
        print(f"✓ Duration model loaded from {path}")
        return instance


class AnomalyDetector:
    """
    Detects suspicious behavior using Isolation Forest.
    Focuses on duration, missing items, and behavioral patterns.
    """

    def __init__(self):
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('iso', IsolationForest(
                contamination=0.05,
                n_estimators=100,
                random_state=42
            ))
        ])
        self.is_trained = False

    def extract_features(self, session_data):
        """
        Extract behavioral features from completed session.
        Expected keys in session_data:
        - actual_duration
        - predicted_duration
        - entry_scans (list)
        - exit_scans (list)
        - entry_time (datetime string or datetime object)
        """
        actual_dur = session_data.get('actual_duration', 10)
        predicted_dur = session_data.get('predicted_duration', 10)

        # Duration anomaly features
        duration_ratio = actual_dur / max(predicted_dur, 1)
        duration_diff = actual_dur - predicted_dur

        # Scan pattern features
        entry_scans = session_data.get('entry_scans', [])
        exit_scans = session_data.get('exit_scans', [])
        num_items_entered = len(entry_scans)
        num_items_exited = len(exit_scans)
        num_missing = len(set(entry_scans) - set(exit_scans))

        # Temporal features
        entry_time = session_data.get('entry_time')
        if isinstance(entry_time, str):
            entry_time = pd.to_datetime(entry_time)

        hour = entry_time.hour
        is_night = int(hour < 6 or hour > 22)  # Suspicious if late night

        features = np.array([
            actual_dur,
            duration_ratio,
            duration_diff,
            num_items_entered,
            num_items_exited,
            num_missing,
            hour,
            is_night
        ]).reshape(1, -1)

        return features

    def train(self, X):
        """Train the anomaly detection model"""
        self.model.fit(X)
        self.is_trained = True
        return self

    def predict(self, X):
        """
        Predict if session is anomalous.
        Returns: -1 for anomaly, 1 for normal
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        return self.model.predict(X)[0]

    def predict_with_score(self, X):
        """
        Returns both prediction and anomaly score.
        Lower scores indicate more anomalous behavior.
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet!")

        prediction = self.model.predict(X)[0]
        # Score samples: lower = more anomalous
        score = self.model.named_steps['iso'].decision_function(
            self.model.named_steps['scaler'].transform(X)
        )[0]

        # Convert decision_function score to a 0-1 probability (higher = more anomalous)
        anomaly_prob = 1 / (1 + np.exp(score * 5)) # Multiplied by 5 to make the curve steeper

        # === FIXED LOGIC START: Rule-based override for missing items ===
        num_missing_items = X[0, 5] # 'num_missing' is the 6th feature (index 5) in extract_features

        if num_missing_items > 0:
            anomaly_prob = max(anomaly_prob, 0.9) # Force high anomaly probability
            prediction = -1 # Force anomaly prediction
            print(f"  [AnomalyDetector] FORCING ANOMALY: {num_missing_items} item(s) missing from scans.")
        # === FIXED LOGIC END ===

        return {
            'is_anomaly': prediction == -1,
            'anomaly_score': round(float(anomaly_prob), 3),
            'risk_level': 'high' if anomaly_prob > 0.7 else 'medium' if anomaly_prob > 0.4 else 'low'
        }

    def save(self, path='models/anomaly_model.pkl'):
        """Save trained model"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.model, path)
        print(f"✓ Anomaly model saved to {path}")

    @classmethod
    def load(cls, path='models/anomaly_model.pkl'):
        """Load trained model"""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model not found at {path}. Train first!")
        instance = cls()
        instance.model = joblib.load(path)
        instance.is_trained = True
        print(f"✓ Anomaly model loaded from {path}")
        return instance
