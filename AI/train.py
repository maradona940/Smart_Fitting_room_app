import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

from models import DurationPredictor, AnomalyDetector  # Only using models

# Try to import database integration, fallback to file-based loading
try:
    from db_integration import load_item_database_from_db, load_historical_sessions_from_db
    USE_DATABASE = True
except ImportError:
    USE_DATABASE = False
    print("⚠ Database integration not available, using file-based loading")


def load_data():
    """Load all data files - from database if available, otherwise from files"""
    print("Loading data...")

    if USE_DATABASE:
        try:
            # Load from database
            item_db = load_item_database_from_db()
            sessions_df = load_historical_sessions_from_db()
            
            print(f"✓ Loaded {len(item_db)} items from database")
            print(f"✓ Loaded {len(sessions_df)} sessions from database")
            if not sessions_df.empty:
                print(f"  - Normal sessions: {(~sessions_df['is_anomaly']).sum()}")
                print(f"  - Anomalous sessions: {sessions_df['is_anomaly'].sum()}")
            
            return item_db, sessions_df
        except Exception as e:
            print(f"⚠ Error loading from database: {e}")
            print("⚠ Falling back to file-based loading...")
    
    # Fallback to file-based loading
    # Load item database
    item_db_path = 'data/item_database.json'
    if not os.path.exists(item_db_path):
        raise FileNotFoundError(f"Item database not found at {item_db_path}. Please set up database or run simulate_data.py.")
    
    with open(item_db_path, 'r') as f:
        item_db = json.load(f)

    # Load historical sessions
    sessions_path = 'data/historical_sessions.csv'
    if not os.path.exists(sessions_path):
        print(f"⚠ Warning: Historical sessions not found at {sessions_path}.")
        print("⚠ Creating empty DataFrame. Model training will be limited.")
        sessions_df = pd.DataFrame(columns=['session_id', 'entry_time', 'exit_time', 'item_ids', 'entry_scans', 'exit_scans', 'duration', 'is_anomaly'])
    else:
        sessions_df = pd.read_csv(sessions_path)
        sessions_df['item_ids'] = sessions_df['item_ids'].apply(json.loads)
        sessions_df['entry_time'] = pd.to_datetime(sessions_df['entry_time'])
        sessions_df['exit_time'] = pd.to_datetime(sessions_df['exit_time'])
        sessions_df['entry_scans'] = sessions_df['entry_scans'].apply(json.loads)
        sessions_df['exit_scans'] = sessions_df['exit_scans'].apply(json.loads)

    print(f"✓ Loaded {len(item_db)} items from file")
    print(f"✓ Loaded {len(sessions_df)} sessions from file")
    if not sessions_df.empty:
        print(f"  - Normal sessions: {(~sessions_df['is_anomaly']).sum()}")
        print(f"  - Anomalous sessions: {sessions_df['is_anomaly'].sum()}")

    return item_db, sessions_df


def train_duration_model(item_db, sessions_df):
    """Train duration prediction model"""
    print("\n" + "="*60)
    print("TRAINING DURATION PREDICTION MODEL")
    print("="*60)

    duration_model = DurationPredictor()

    X, y = [], []

    print("Extracting features...")
    valid_sessions_df = sessions_df[sessions_df['item_ids'].apply(lambda x: isinstance(x, list) and len(x) > 0)]

    for _, row in valid_sessions_df.iterrows():
        try:
            features = duration_model.extract_features(
                row['item_ids'], item_db, row['entry_time']
            )
            X.append(features[0])
            y.append(row['duration'])
        except Exception as e:
            print(f"  Warning: Skipping session {row.get('session_id', '?')} due to feature extraction error: {e}")

    if not X:
        print("Error: No valid features extracted for duration model training. Check data.")
        return None

    X = np.array(X)
    y = np.array(y)

    print(f"✓ Extracted features for {len(X)} sessions")
    print(f"  Feature shape: {X.shape}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("\nTraining Random Forest...")
    duration_model.train(X_train, y_train)

    y_pred = duration_model.model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("\n📊 DURATION MODEL RESULTS:")
    print(f"  Mean Absolute Error: {mae:.2f} minutes")
    print(f"  R² Score: {r2:.3f}")
    print(f"  Average actual duration: {y_test.mean():.2f} minutes")

    duration_model.save()

    # Plot predictions vs actual
    plt.figure(figsize=(10, 6))
    plt.scatter(y_test, y_pred, alpha=0.5)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
    plt.xlabel('Actual Duration (minutes)')
    plt.ylabel('Predicted Duration (minutes)')
    plt.title(f'Duration Prediction Model (MAE: {mae:.2f}, R²: {r2:.3f})')
    plt.tight_layout()
    plt.savefig('models/duration_model_performance.png', dpi=150)
    print("✓ Saved performance plot to models/duration_model_performance.png")

    return duration_model


def train_anomaly_model(item_db, sessions_df, duration_model):
    """Train anomaly detection model"""
    print("\n" + "="*60)
    print("TRAINING ANOMALY DETECTION MODEL")
    print("="*60)

    if duration_model is None:
        print("Error: Duration model not trained. Cannot train anomaly model.")
        return None

    anomaly_model = AnomalyDetector()
    X_all, y_all = [], []

    print("Extracting behavioral features...")
    for _, row in sessions_df.iterrows():
        try:
            item_ids = row['item_ids'] if isinstance(row['item_ids'], list) else []

            predicted_dur = duration_model.predict(
                duration_model.extract_features(item_ids, item_db, row['entry_time'])
            )

            session_data = {
                'actual_duration': row['duration'],
                'predicted_duration': predicted_dur,
                'entry_scans': row['entry_scans'],
                'exit_scans': row['exit_scans'],
                'entry_time': row['entry_time']
            }

            features = anomaly_model.extract_features(session_data)
            X_all.append(features[0])
            y_all.append(-1 if row['is_anomaly'] else 1)

        except Exception as e:
            print(f"  Warning: Skipping session {row.get('session_id', '?')} due to feature extraction error: {e}")

    if not X_all:
        print("Error: No valid features extracted for anomaly model training. Check data.")
        return None

    X_all = np.array(X_all)
    y_all = np.array(y_all)

    X_train = X_all[y_all == 1]
    print(f"✓ Extracted features for {len(X_all)} sessions")
    print(f"  Training on {len(X_train)} normal sessions")

    if len(X_train) == 0:
        print("Error: No normal sessions found for anomaly model training. Cannot train.")
        return None

    print("\nTraining Isolation Forest...")
    anomaly_model.train(X_train)

    y_pred = [anomaly_model.predict(x.reshape(1, -1)) for x in X_all]

    print("\n📊 ANOMALY DETECTION RESULTS:")
    print(classification_report(
        y_all, y_pred,
        target_names=['Anomaly', 'Normal'],
        zero_division=0
    ))

    # Confusion matrix
    cm = confusion_matrix(y_all, y_pred, labels=[-1, 1])
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Predicted Anomaly', 'Predicted Normal'],
                yticklabels=['Actual Anomaly', 'Actual Normal'])
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Anomaly Detection Confusion Matrix')
    plt.tight_layout()
    plt.savefig('models/anomaly_model_confusion_matrix.png', dpi=150)
    print("✓ Saved confusion matrix to models/anomaly_model_confusion_matrix.png")

    anomaly_model.save()

    return anomaly_model


def generate_summary_report(sessions_df, item_db):
    """Generate a simple summary report using only pandas"""
    print("\n" + "="*60)
    print("GENERATING BASIC DATA INSIGHTS")
    print("="*60)

    # Convert times if not already
    sessions_df['hour'] = sessions_df['entry_time'].dt.hour
    sessions_df['date'] = sessions_df['entry_time'].dt.date

    # --- Top items ---
    item_counts = {}
    for items in sessions_df['item_ids']:
        if isinstance(items, list):
            for item_id in items:
                item_counts[item_id] = item_counts.get(item_id, 0) + 1
    top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    print("\n📈 TOP 5 MOST TRIED ITEMS:")
    if top_items:
        for item_id, count in top_items:
            item_info = item_db.get(str(item_id), {})
            name = item_info.get('name', f"Item {item_id}")
            category = item_info.get('category', 'Unknown')
            print(f"  - {name} ({category}): {count} sessions")
    else:
        print("  No item data available.")

    # --- Peak hours ---
    hourly_counts = sessions_df.groupby('hour').size()
    if not hourly_counts.empty:
        busiest_hour = hourly_counts.idxmax()
        print("\n⏰ PEAK SHOPPING HOURS:")
        print(f"  Busiest hour: {busiest_hour}:00 with {hourly_counts[busiest_hour]} sessions")
        print(f"  Avg sessions per hour: {hourly_counts.mean():.1f}")
    else:
        print("\n⏰ No hourly data available.")

    # --- Daily stats ---
    daily_sessions = sessions_df.groupby('date').agg({
        'duration': 'mean',
        'session_id': 'count'
    }).rename(columns={'session_id': 'sessions'})

    if not daily_sessions.empty:
        print("\n📅 LAST 30 DAYS STATISTICS:")
        print(f"  Total sessions: {daily_sessions['sessions'].sum()}")
        print(f"  Avg sessions/day: {daily_sessions['sessions'].mean():.1f}")
        print(f"  Avg duration/session: {daily_sessions['duration'].mean():.1f} minutes")
        print(f"  Peak day: {daily_sessions['sessions'].idxmax()} ({daily_sessions['sessions'].max()} sessions)")
    else:
        print("\n📅 No daily stats available.")

    # --- Save a quick plot ---
    plt.figure(figsize=(10, 5))
    daily_sessions['sessions'].plot(kind='bar', alpha=0.7)
    plt.title('Sessions per Day (Last 30 Days)')
    plt.xlabel('Date')
    plt.ylabel('Sessions')
    plt.tight_layout()
    plt.savefig('models/daily_sessions_summary.png', dpi=150)
    print("✓ Saved daily sessions summary plot to models/daily_sessions_summary.png")


if __name__ == "__main__":
    if not os.path.exists('models'):
        os.makedirs('models')

    item_db, sessions_df = load_data()

    duration_predictor = train_duration_model(item_db, sessions_df)
    anomaly_detector = train_anomaly_model(item_db, sessions_df, duration_predictor)

    # Replaces old analytics step
    generate_summary_report(sessions_df, item_db)

    print("\nTraining and reporting complete!")
