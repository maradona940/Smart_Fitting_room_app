import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
import random
import os

def generate_item_database_from_db():
    """Loads item database from PostgreSQL database instead of generating random data"""
    try:
        from db_integration import load_item_database_from_db
        item_db = load_item_database_from_db()
        print(f"✓ Loaded {len(item_db)} items from database")
        return item_db
    except Exception as e:
        print(f"⚠ Warning: Could not load from database: {e}")
        print("⚠ Falling back to generating sample data matching database products...")
        return generate_item_database_fallback()

def generate_item_database_fallback():
    """Generates item database matching actual database products (SKU-0001 to SKU-0012)"""
    item_db = {}
    
    # Match the actual database products exactly
    db_products = [
        {'sku': 'SKU-0001', 'name': 'Summer Dress', 'size': 'M', 'color': 'Blue', 'category': 'Dress', 'material': 'cotton', 'price': 49.99, 'complexity': 6, 'has_zipper': False, 'has_buttons': True},
        {'sku': 'SKU-0002', 'name': 'Summer Dress', 'size': 'L', 'color': 'Blue', 'category': 'Dress', 'material': 'cotton', 'price': 49.99, 'complexity': 6, 'has_zipper': False, 'has_buttons': True},
        {'sku': 'SKU-0003', 'name': 'Cotton Shirt', 'size': 'M', 'color': 'White', 'category': 'T-Shirt', 'material': 'cotton', 'price': 29.99, 'complexity': 4, 'has_zipper': False, 'has_buttons': True},
        {'sku': 'SKU-0004', 'name': 'Cotton Shirt', 'size': 'L', 'color': 'White', 'category': 'T-Shirt', 'material': 'cotton', 'price': 29.99, 'complexity': 4, 'has_zipper': False, 'has_buttons': True},
        {'sku': 'SKU-0005', 'name': 'Denim Jeans', 'size': 'L', 'color': 'Blue', 'category': 'Pants', 'material': 'denim', 'price': 79.99, 'complexity': 5, 'has_zipper': False, 'has_buttons': True},
        {'sku': 'SKU-0006', 'name': 'Denim Jeans', 'size': 'S', 'color': 'Blue', 'category': 'Pants', 'material': 'denim', 'price': 79.99, 'complexity': 5, 'has_zipper': False, 'has_buttons': True},
        {'sku': 'SKU-0007', 'name': 'Leather Jacket', 'size': 'M', 'color': 'Black', 'category': 'Jacket', 'material': 'leather', 'price': 199.99, 'complexity': 8, 'has_zipper': True, 'has_buttons': True},
        {'sku': 'SKU-0008', 'name': 'Leather Jacket', 'size': 'L', 'color': 'Black', 'category': 'Jacket', 'material': 'leather', 'price': 199.99, 'complexity': 8, 'has_zipper': True, 'has_buttons': True},
        {'sku': 'SKU-0009', 'name': 'Pleated Skirt', 'size': 'S', 'color': 'Red', 'category': 'Skirt', 'material': 'polyester', 'price': 39.99, 'complexity': 5, 'has_zipper': False, 'has_buttons': False},
        {'sku': 'SKU-0010', 'name': 'Pleated Skirt', 'size': 'M', 'color': 'Red', 'category': 'Skirt', 'material': 'polyester', 'price': 39.99, 'complexity': 5, 'has_zipper': False, 'has_buttons': False},
        {'sku': 'SKU-0011', 'name': 'Blouse', 'size': 'M', 'color': 'Pink', 'category': 'T-Shirt', 'material': 'silk', 'price': 59.99, 'complexity': 7, 'has_zipper': False, 'has_buttons': True},
        {'sku': 'SKU-0012', 'name': 'Blouse', 'size': 'L', 'color': 'Pink', 'category': 'T-Shirt', 'material': 'silk', 'price': 59.99, 'complexity': 7, 'has_zipper': False, 'has_buttons': True},
    ]
    
    for product in db_products:
        item_db[product['sku']] = {
            'name': product['name'],
            'category': product['category'],
            'size': product['size'],
            'color': product['color'],
            'price': product['price'],
            'material': product['material'],
            'has_buttons': product['has_buttons'],
            'has_zipper': product['has_zipper'],
            'complexity_score': product['complexity']
        }
    
    # Generate additional items for training (SKU-0013 to SKU-0100) matching database patterns
    categories = ['T-Shirt', 'Pants', 'Jacket', 'Dress', 'Skirt', 'Sweater']
    materials = ['cotton', 'polyester', 'denim', 'wool', 'silk', 'leather']
    colors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Gray', 'Yellow', 'Pink', 'Purple', 'Brown']
    sizes = ['S', 'M', 'L']
    
    for i in range(13, 101):  # SKU-0013 to SKU-0100
        item_id = f"SKU-{i:04d}"
        category = random.choice(categories)
        material = random.choice(materials)
        price = round(random.uniform(15.0, 250.0), 2)
        color = random.choice(colors)
        size = random.choice(sizes)

        # Complexity score matching database logic
        complexity_score = 0
        if category in ['Jacket', 'Dress']:
            complexity_score += 3
        if material in ['leather', 'silk', 'wool']:
            complexity_score += 2
        complexity_score += random.randint(1, 5)
        complexity_score = min(10, complexity_score)

        item_db[item_id] = {
            'name': f"{category} {item_id}",
            'category': category,
            'size': size,
            'color': color,
            'price': price,
            'material': material,
            'has_buttons': random.choice([True, False]),
            'has_zipper': random.choice([True, False]),
            'complexity_score': complexity_score
        }

    with open('data/item_database.json', 'w') as f:
        json.dump(item_db, f, indent=4)
    print(f"✓ Generated {len(item_db)} items (12 from DB + {len(item_db)-12} additional) in data/item_database.json")
    return item_db

def generate_item_database(num_items=100):
    """Legacy function - now tries database first, then fallback"""
    return generate_item_database_from_db()


def generate_historical_sessions(item_db, num_sessions=5000):
    """Generates mock historical session data with realistic patterns"""
    sessions = []
    start_date = datetime.now() - timedelta(days=365)
    item_ids = list(item_db.keys())

    for i in range(num_sessions):
        entry_time = start_date + timedelta(minutes=random.randint(0, 365*24*60))

        # Peak times: more items, longer durations
        is_peak_hour = 17 <= entry_time.hour <= 20 or entry_time.weekday() >= 5

        num_items_taken = random.randint(1, 5) + (2 if is_peak_hour else 0)
        num_items_taken = min(num_items_taken, 8)

        # Ensure we use actual database products (SKU-0001 to SKU-0012) preferentially
        # Mix actual DB products with generated ones for training diversity
        db_skus = [sku for sku in item_ids if sku.startswith('SKU-') and int(sku.split('-')[1]) <= 12]
        other_skus = [sku for sku in item_ids if sku not in db_skus]
        
        # Prefer actual DB products in sessions
        if len(db_skus) > 0 and num_items_taken <= len(db_skus):
            # Use only actual DB products
            session_items = random.sample(db_skus, num_items_taken)
        elif len(db_skus) > 0:
            # Mix actual DB products with generated ones
            num_db_items = min(num_items_taken, len(db_skus))
            num_other_items = num_items_taken - num_db_items
            session_items = random.sample(db_skus, num_db_items)
            if num_other_items > 0 and len(other_skus) > 0:
                session_items.extend(random.sample(other_skus, min(num_other_items, len(other_skus))))
        else:
            # Fallback to any items
            session_items = random.sample(item_ids, min(num_items_taken, len(item_ids)))

        # Calculate duration based on items
        base_duration = num_items_taken * random.uniform(1.5, 3.0)
        total_complexity = sum(item_db[iid]['complexity_score'] for iid in session_items)
        base_duration += total_complexity * random.uniform(0.5, 1.0)

        duration = base_duration * random.uniform(0.8, 1.5)
        if is_peak_hour:
            duration *= random.uniform(1.1, 1.3)

        duration = max(3, round(duration))
        exit_time = entry_time + timedelta(minutes=duration)

        # Simulate anomalies (2% chance)
        is_anomaly = False
        anomaly_type = None
        if random.random() < 0.02:
            is_anomaly = True
            anomaly_type = random.choice(['overstay', 'missing_items', 'quick_exit'])

            if anomaly_type == 'overstay':
                duration *= random.uniform(2.0, 3.5)
                exit_time = entry_time + timedelta(minutes=duration)
            elif anomaly_type == 'quick_exit':
                duration = random.uniform(2, 5)
                exit_time = entry_time + timedelta(minutes=duration)

        # Simulate RFID scans
        entry_scans = list(session_items)
        exit_scans = list(session_items)

        if is_anomaly and anomaly_type == 'missing_items' and len(session_items) > 1:
            num_missing = random.randint(1, max(1, len(session_items) - 1))
            exit_scans = random.sample(session_items, len(session_items) - num_missing)

        sessions.append({
            'session_id': f"sess_{i:05d}",
            # --- CRITICAL CHANGE HERE ---
            'room_id': f"room_{random.randint(1, 2)}", # Changed from random.randint(1, 6) to random.randint(1, 2)
            # ----------------------------
            'card_id': f"card_{random.randint(1000, 9999)}",
            'item_ids': session_items,
            'entry_time': entry_time.isoformat(),
            'exit_time': exit_time.isoformat(),
            'duration': duration,
            'entry_scans': entry_scans,
            'exit_scans': exit_scans,
            'is_anomaly': is_anomaly,
            'anomaly_type': anomaly_type
        })

    df = pd.DataFrame(sessions)
    df['item_ids'] = df['item_ids'].apply(lambda x: json.dumps(x))
    df['entry_scans'] = df['entry_scans'].apply(lambda x: json.dumps(x))
    df['exit_scans'] = df['exit_scans'].apply(lambda x: json.dumps(x))

    df.to_csv('data/historical_sessions.csv', index=False)
    print(f"✓ Generated {num_sessions} historical sessions in data/historical_sessions.csv")

    # Create anomaly training data (mostly normal sessions)
    anomaly_df = df[~df['is_anomaly']].copy()
    anomaly_df.to_csv('data/anomaly_training_data.csv', index=False)
    print(f"✓ Generated anomaly training data in data/anomaly_training_data.csv")


if __name__ == "__main__":
    if not os.path.exists('data'):
        os.makedirs('data')

    print("=== Generating Training Data ===")
    print("NOTE: Training data will use actual database products (SKU-0001 to SKU-0012)")
    print("      Additional products will be generated for training diversity\n")
    
    item_db = generate_item_database()
    generate_historical_sessions(item_db, 5000)
    print("\n✓ All training data generated successfully!")
    print(f"✓ Training data includes {len([s for s in item_db.keys() if s.startswith('SKU-') and int(s.split('-')[1]) <= 12])} actual database products")
