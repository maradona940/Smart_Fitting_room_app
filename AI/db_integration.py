"""
Database integration for AI service
Reads and writes data from PostgreSQL database instead of JSON/CSV files
"""
import os
import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from decouple import config

# Database connection configuration
DB_CONFIG = {
    'host': config('DB_HOST', default='localhost'),
    'port': config('DB_PORT', default='5432'),
    'database': config('DB_NAME', default='fitting_room_system'),
    'user': config('DB_USER', default='postgres'),
    'password': config('DB_PASSWORD', default=''),
}

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(**DB_CONFIG)

def load_item_database_from_db() -> Dict:
    """
    Load item database from PostgreSQL products table
    Returns: Dictionary mapping SKU to item data (same format as JSON file)
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    sku,
                    name,
                    size,
                    color,
                    category,
                    material,
                    price,
                    complexity_score,
                    has_zipper,
                    has_buttons
                FROM products
            """)
            
            items = {}
            for row in cur.fetchall():
                items[row['sku']] = {
                    'name': row['name'],
                    'category': row['category'] or 'Unknown',
                    'size': row['size'] or 'Unknown',
                    'color': row['color'] or 'Unknown',
                    'price': float(row['price']) if row['price'] else 0.0,
                    'material': row['material'] or 'Unknown',
                    'has_buttons': bool(row['has_buttons']),
                    'has_zipper': bool(row['has_zipper']),
                    'complexity_score': int(row['complexity_score']) if row['complexity_score'] else 5,
                }
            
            print(f"✓ Loaded {len(items)} items from database")
            return items
    finally:
        conn.close()

def load_historical_sessions_from_db() -> pd.DataFrame:
    """
    Load historical sessions from PostgreSQL sessions table
    Returns: DataFrame with same format as CSV file
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get sessions with their entry/exit scans
            cur.execute("""
                SELECT 
                    s.session_id,
                    s.entry_time,
                    s.exit_time,
                    s.duration_minutes as duration,
                    s.is_anomaly,
                    s.room_id,
                    s.customer_rfid
                FROM sessions s
                WHERE s.status = 'completed'
                ORDER BY s.entry_time DESC
                LIMIT 10000
            """)
            
            sessions_data = cur.fetchall()
            
            if not sessions_data:
                print("⚠ No completed sessions found in database")
                return pd.DataFrame(columns=[
                    'session_id', 'entry_time', 'exit_time', 'item_ids', 
                    'entry_scans', 'exit_scans', 'duration', 'is_anomaly'
                ])
            
            # Get entry and exit scans for each session
            sessions_list = []
            for session in sessions_data:
                session_id = session['session_id']
                
                # Get entry scans (items scanned in)
                cur.execute("""
                    SELECT p.sku
                    FROM room_products rp
                    JOIN products p ON rp.product_id = p.id
                    WHERE rp.session_id = %s AND rp.in_entry_scan = TRUE
                    ORDER BY rp.scanned_in_at
                """, (session_id,))
                
                entry_scans = [row['sku'] for row in cur.fetchall()]
                
                # Get exit scans (items scanned out)
                cur.execute("""
                    SELECT p.sku
                    FROM room_products rp
                    JOIN products p ON rp.product_id = p.id
                    WHERE rp.session_id = %s AND rp.in_exit_scan = TRUE
                    ORDER BY rp.scanned_out_at
                """, (session_id,))
                
                exit_scans = [row['sku'] for row in cur.fetchall()]
                
                # Get all items in session
                cur.execute("""
                    SELECT p.sku
                    FROM room_products rp
                    JOIN products p ON rp.product_id = p.id
                    WHERE rp.session_id = %s
                    ORDER BY rp.scanned_in_at
                """, (session_id,))
                
                item_ids = [row['sku'] for row in cur.fetchall()]
                
                sessions_list.append({
                    'session_id': session_id,
                    'entry_time': session['entry_time'],
                    'exit_time': session['exit_time'],
                    'item_ids': item_ids,
                    'entry_scans': entry_scans,
                    'exit_scans': exit_scans,
                    'duration': float(session['duration_minutes']) if session['duration_minutes'] else 0.0,
                    'is_anomaly': bool(session['is_anomaly']) if session['is_anomaly'] is not None else False,
                })
            
            df = pd.DataFrame(sessions_list)
            
            # Convert datetime columns
            if not df.empty:
                df['entry_time'] = pd.to_datetime(df['entry_time'])
                df['exit_time'] = pd.to_datetime(df['exit_time'])
            
            print(f"✓ Loaded {len(df)} historical sessions from database")
            return df
            
    finally:
        conn.close()

def save_session_to_db(
    session_id: str,
    room_id: int,
    customer_rfid: str,
    entry_time: datetime,
    exit_time: Optional[datetime],
    item_ids: List[str],
    entry_scans: List[str],
    exit_scans: List[str],
    predicted_duration: Optional[float] = None,
    is_anomaly: Optional[bool] = None,
    anomaly_score: Optional[float] = None,
    risk_level: Optional[str] = None
):
    """
    Save a completed session to the database for AI training
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Calculate duration
            duration_minutes = None
            if exit_time and entry_time:
                duration_minutes = (exit_time - entry_time).total_seconds() / 60.0
            
            # Determine status
            status = 'completed' if exit_time else 'active'
            
            # Insert or update session
            cur.execute("""
                INSERT INTO sessions (
                    session_id, room_id, customer_rfid, entry_time, exit_time,
                    duration_minutes, predicted_duration_minutes,
                    is_anomaly, anomaly_score, risk_level, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_id) DO UPDATE SET
                    exit_time = EXCLUDED.exit_time,
                    duration_minutes = EXCLUDED.duration_minutes,
                    predicted_duration_minutes = EXCLUDED.predicted_duration_minutes,
                    is_anomaly = EXCLUDED.is_anomaly,
                    anomaly_score = EXCLUDED.anomaly_score,
                    risk_level = EXCLUDED.risk_level,
                    status = EXCLUDED.status,
                    updated_at = NOW()
            """, (
                session_id, room_id, customer_rfid, entry_time, exit_time,
                duration_minutes, predicted_duration_minutes,
                is_anomaly, anomaly_score, risk_level, status
            ))
            
            # Update room_products with session_id and scan flags
            for sku in item_ids:
                # Get product ID
                cur.execute("SELECT id FROM products WHERE sku = %s", (sku,))
                product_result = cur.fetchone()
                if not product_result:
                    continue
                product_id = product_result[0]
                
                # Update or insert room_product
                cur.execute("""
                    INSERT INTO room_products (
                        session_id, room_id, product_id,
                        scanned_in_at, scanned_out_at,
                        in_entry_scan, in_exit_scan
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    session_id, room_id, product_id,
                    entry_time if sku in entry_scans else None,
                    exit_time if sku in exit_scans else None,
                    sku in entry_scans,
                    sku in exit_scans
                ))
            
            conn.commit()
            print(f"✓ Saved session {session_id} to database")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Error saving session to database: {e}")
        raise
    finally:
        conn.close()

def sync_ai_data_to_db():
    """
    Sync AI training data from JSON/CSV files to database
    This is a migration utility to populate the database with existing AI data
    """
    print("Syncing AI training data to database...")
    
    # Load item database from JSON
    item_db_path = 'data/item_database.json'
    if os.path.exists(item_db_path):
        with open(item_db_path, 'r') as f:
            item_db = json.load(f)
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                for sku, item_data in item_db.items():
                    # Check if product exists
                    cur.execute("SELECT id FROM products WHERE sku = %s", (sku,))
                    if cur.fetchone():
                        # Update existing product
                        cur.execute("""
                            UPDATE products SET
                                category = %s,
                                material = %s,
                                price = %s,
                                complexity_score = %s,
                                has_zipper = %s,
                                has_buttons = %s,
                                updated_at = NOW()
                            WHERE sku = %s
                        """, (
                            item_data.get('category', 'Unknown'),
                            item_data.get('material', 'Unknown'),
                            item_data.get('price', 0.0),
                            item_data.get('complexity_score', 5),
                            item_data.get('has_zipper', False),
                            item_data.get('has_buttons', False),
                            sku
                        ))
                    else:
                        # Insert new product
                        cur.execute("""
                            INSERT INTO products (
                                sku, name, size, color, category, material,
                                price, complexity_score, has_zipper, has_buttons
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            sku,
                            item_data.get('name', sku),
                            item_data.get('size', 'Unknown'),
                            item_data.get('color', 'Unknown'),
                            item_data.get('category', 'Unknown'),
                            item_data.get('material', 'Unknown'),
                            item_data.get('price', 0.0),
                            item_data.get('complexity_score', 5),
                            item_data.get('has_zipper', False),
                            item_data.get('has_buttons', False)
                        ))
                
                conn.commit()
                print(f"✓ Synced {len(item_db)} items to database")
        finally:
            conn.close()
    else:
        print(f"⚠ Item database file not found: {item_db_path}")
    
    # Load historical sessions from CSV
    sessions_path = 'data/historical_sessions.csv'
    if os.path.exists(sessions_path):
        df = pd.read_csv(sessions_path)
        df['item_ids'] = df['item_ids'].apply(json.loads)
        df['entry_scans'] = df['entry_scans'].apply(json.loads)
        df['exit_scans'] = df['exit_scans'].apply(json.loads)
        df['entry_time'] = pd.to_datetime(df['entry_time'])
        df['exit_time'] = pd.to_datetime(df['exit_time'])
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                for _, row in df.iterrows():
                    # Check if session exists
                    cur.execute("SELECT id FROM sessions WHERE session_id = %s", (row['session_id'],))
                    if cur.fetchone():
                        continue  # Skip if already exists
                    
                    # Insert session (using room_id = 1 as default)
                    cur.execute("""
                        INSERT INTO sessions (
                            session_id, room_id, entry_time, exit_time,
                            duration_minutes, is_anomaly, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, 'completed')
                    """, (
                        row['session_id'],
                        1,  # Default room_id
                        row['entry_time'],
                        row['exit_time'],
                        row['duration'],
                        row.get('is_anomaly', False)
                    ))
                    
                    # Insert room_products for this session
                    for sku in row['item_ids']:
                        cur.execute("SELECT id FROM products WHERE sku = %s", (sku,))
                        product_result = cur.fetchone()
                        if not product_result:
                            continue
                        product_id = product_result[0]
                        
                        cur.execute("""
                            INSERT INTO room_products (
                                session_id, room_id, product_id,
                                scanned_in_at, scanned_out_at,
                                in_entry_scan, in_exit_scan
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            row['session_id'],
                            1,
                            product_id,
                            row['entry_time'] if sku in row['entry_scans'] else None,
                            row['exit_time'] if sku in row['exit_scans'] else None,
                            sku in row['entry_scans'],
                            sku in row['exit_scans']
                        ))
                
                conn.commit()
                print(f"✓ Synced {len(df)} historical sessions to database")
        finally:
            conn.close()
    else:
        print(f"⚠ Historical sessions file not found: {sessions_path}")

if __name__ == '__main__':
    # Run sync when executed directly
    sync_ai_data_to_db()

