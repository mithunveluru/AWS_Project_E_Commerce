#!/usr/bin/env python3
"""
Dynamic Price Updater - Updates prices based on demand in real-time
Monitors DynamoDB for demand changes and adjusts prices accordingly
"""

import boto3
import time
import json
from decimal import Decimal
from datetime import datetime

# Configuration
TABLE_NAME = 'Products'
DYNAMODB = boto3.resource('dynamodb')
TABLE = DYNAMODB.Table(TABLE_NAME)

# Pricing algorithm parameters
BASE_PRICE_MULTIPLIER = 1.0
DEMAND_SENSITIVITY = 0.02  # 2% price increase per 10 demand points
MIN_PRICE_FACTOR = 0.90    # Never go below 90% of competitor price
MAX_PRICE_FACTOR = 1.25    # Never go above 125% of competitor price

# Store previous state to detect changes
previous_state = {}

def calculate_dynamic_price(base_price, demand_score, competitor_price):
    """
    Calculate price based on demand elasticity
    
    Formula: 
    - Base price starts at competitor price * 1.05
    - Each 10 demand points adds 2% to price
    - Constrained between 90% and 125% of competitor price
    """
    # Calculate demand factor (higher demand = higher price)
    demand_factor = 1 + (demand_score / 10 * DEMAND_SENSITIVITY)
    
    # Start with competitive base price
    base = competitor_price * 1.05
    
    # Apply demand multiplier
    new_price = base * demand_factor
    
    # Apply business constraints
    min_price = competitor_price * MIN_PRICE_FACTOR
    max_price = competitor_price * MAX_PRICE_FACTOR
    
    # Constrain price
    final_price = max(min_price, min(new_price, max_price))
    
    return round(final_price, 2)

def get_all_products():
    """Fetch all products from DynamoDB"""
    try:
        response = TABLE.scan()
        return response.get('Items', [])
    except Exception as e:
        print(f"Error fetching products: {e}")
        return []

def update_product_price(product_id, new_price):
    """Update product price in DynamoDB"""
    try:
        TABLE.update_item(
            Key={'productId': product_id},
            UpdateExpression='SET price = :p',
            ExpressionAttributeValues={':p': Decimal(str(new_price))}
        )
        return True
    except Exception as e:
        print(f"Error updating price for {product_id}: {e}")
        return False

def detect_and_update_prices():
    """Main logic: detect demand changes and update prices"""
    global previous_state
    
    products = get_all_products()
    changes_made = False
    
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Checking for demand changes...")
    print("=" * 80)
    
    for product in products:
        product_id = product['productId']
        product_name = product['productName']
        current_price = float(product['price'])
        demand_score = float(product['demandScore'])
        competitor_price = float(product.get('competitorPrice', current_price * 0.95))
        
        # Check if demand has changed since last check
        prev_demand = previous_state.get(product_id, {}).get('demand', demand_score)
        
        if demand_score != prev_demand:
            # Demand changed! Calculate new price
            new_price = calculate_dynamic_price(current_price, demand_score, competitor_price)
            
            # Only update if price changed significantly (more than ₹5)
            if abs(new_price - current_price) >= 5:
                print(f"📊 {product_name} (ID: {product_id})")
                print(f"   Demand: {prev_demand:.0f} → {demand_score:.0f} views")
                print(f"   Price:  ₹{current_price:.2f} → ₹{new_price:.2f}")
                print(f"   Change: {((new_price/current_price - 1) * 100):+.1f}%")
                
                # Update price in DynamoDB
                if update_product_price(product_id, new_price):
                    print(f"   ✅ Price updated successfully!")
                    changes_made = True
                else:
                    print(f"   ❌ Failed to update price")
                print()
        
        # Store current state for next iteration
        previous_state[product_id] = {
            'demand': demand_score,
            'price': current_price
        }
    
    if not changes_made:
        print("No significant price changes needed.")
    
    print("=" * 80)

def monitor_loop(interval=10):
    """Continuously monitor and update prices"""
    print("🚀 Dynamic Price Updater Started")
    print(f"📍 Monitoring table: {TABLE_NAME}")
    print(f"⏱️  Check interval: {interval} seconds")
    print(f"💡 Price sensitivity: {DEMAND_SENSITIVITY * 100}% per 10 demand points")
    print(f"📊 Price range: {MIN_PRICE_FACTOR * 100}% - {MAX_PRICE_FACTOR * 100}% of competitor")
    print("\nPress Ctrl+C to stop\n")
    
    try:
        while True:
            detect_and_update_prices()
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping price updater...")
        print("Final state saved. Goodbye!")

if __name__ == "__main__":
    # Run with 10-second intervals (adjust as needed)
    monitor_loop(interval=10)
