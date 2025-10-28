import json
import boto3
import csv
from io import StringIO
from datetime import datetime
from decimal import Decimal

# --- No changes to this section ---
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
sagemaker_runtime = boto3.client('sagemaker-runtime')

table = dynamodb.Table('Products')
endpoint_name = 'price-optimization-endpoint'
bucket_name = 'ecommerce-ml-data-mithunveluru4934'

def load_competitor_prices():
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key='competitor-prices.csv')
        content = response['Body'].read().decode('utf-8')
        csv_reader = csv.DictReader(StringIO(content))
        competitor_prices = {row['productId']: float(row['competitorPrice']) for row in csv_reader}
        return competitor_prices
    except Exception as e:
        print(f"ERROR: Could not load competitor prices. {str(e)}")
        return {}

def predict_price(demand_score, competitor_price, time_of_day):
    try:
        payload = f"{demand_score},{competitor_price},{time_of_day}"
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=endpoint_name,
            ContentType='text/csv',
            Body=payload
        )
        result = json.loads(response['Body'].read().decode())
        predicted_price = result['predictions'][0]['score']
        print(f"  🧠 SageMaker Prediction: {round(predicted_price, 2)}")
        return round(predicted_price, 2)
    except Exception as e:
        print(f"  ⚠️ SageMaker call failed: {str(e)}. Using fallback pricing.")
        base_price = competitor_price * 1.05
        demand_adjustment = demand_score * 2
        fallback_price = round(base_price + demand_adjustment, 2)
        print(f"  Fallback Price Calculated: {fallback_price}")
        return fallback_price

# --- Changes are in lambda_handler ---
def lambda_handler(event, context):
    try:
        print("🚀 Starting price optimization cycle...")
        
        competitor_prices = load_competitor_prices()
        current_hour = datetime.now().hour
        
        response = table.scan()
        products = response['Items']
        
        print(f"Found {len(products)} products to process.")
        updated_count = 0
        
        for product in products:
            product_id = product['productId']
            demand_score = float(product.get('demandScore', 0))
            current_price = float(product['price'])
            
            print(f"\n--- Processing Product: {product_id} ---")
            print(f"  Current Price: {current_price}, Current Demand: {demand_score}")

            competitor_price = competitor_prices.get(product_id, current_price * 0.95)
            print(f"  Competitor Price: {competitor_price}")
            
            # This is the price predicted by the ML model
            optimized_price = predict_price(demand_score, competitor_price, current_hour)
            
            # Your business logic for price clamping
            min_price = round(competitor_price * 0.95, 2)
            max_price = round(competitor_price * 2.50, 2)
            print(f"  Business Rules: Min Price={min_price}, Max Price={max_price}")

            # Apply the clamping
            final_price = max(min_price, min(optimized_price, max_price))
            final_price = round(final_price, 2)
            
            # --- IMPORTANT: Check if the price has actually changed ---
            if abs(final_price - current_price) > 0.01: # Only update if price changes
                table.update_item(
                    Key={'productId': product_id},
                    UpdateExpression='SET price = :p, competitorPrice = :cp',
                    ExpressionAttributeValues={
                        ':p': Decimal(str(final_price)),
                        ':cp': Decimal(str(competitor_price))
                    }
                )
                print(f"  ✅ PRICE UPDATED: {current_price} -> {final_price}")
                updated_count += 1
            else:
                final_price = current_price # Ensure log shows the correct unchanged price
                print(f"  ⚖️ PRICE STABLE: Optimized price is too similar to current price. No change made.")

            # Reset demand score at midnight
            if current_hour == 0:
                table.update_item(
                    Key={'productId': product_id},
                    UpdateExpression='SET demandScore = :zero',
                    ExpressionAttributeValues={':zero': Decimal(0)}
                )
        
        print(f"\nCycle complete. Successfully updated {updated_count} products.")
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully updated {updated_count} products',
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        print(f"CRITICAL ERROR in price optimizer: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

