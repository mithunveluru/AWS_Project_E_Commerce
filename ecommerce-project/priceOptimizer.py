import json
import boto3
import csv
from io import StringIO
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
sagemaker_runtime = boto3.client('sagemaker-runtime')

table = dynamodb.Table('Products')
endpoint_name = 'price-optimization-endpoint'
bucket_name = 'ecommerce-ml-data-mithunveluru4934'  # REPLACE THIS

def load_competitor_prices():
    try:
        response = s3_client.get_object(
            Bucket=bucket_name,
            Key='competitor-prices.csv'
        )
        content = response['Body'].read().decode('utf-8')
        csv_reader = csv.DictReader(StringIO(content))
        
        competitor_prices = {}
        for row in csv_reader:
            competitor_prices[row['productId']] = float(row['competitorPrice'])
        
        return competitor_prices
    except Exception as e:
        print(f"Error loading competitor prices: {str(e)}")
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
        
        return round(predicted_price, 2)
    except Exception as e:
        print(f"Error predicting price: {str(e)}")
        base_price = competitor_price * 1.05
        demand_adjustment = demand_score * 2
        return round(base_price + demand_adjustment, 2)

def lambda_handler(event, context):
    try:
        print("Starting price optimization...")
        
        competitor_prices = load_competitor_prices()
        current_hour = datetime.now().hour
        
        response = table.scan()
        products = response['Items']
        
        updated_count = 0
        
        for product in products:
            product_id = product['productId']
            demand_score = float(product.get('demandScore', 0))
            current_price = float(product['price'])
            
            competitor_price = competitor_prices.get(
                product_id,
                current_price * 0.95
            )
            
            table.update_item(
                Key={'productId': product_id},
                UpdateExpression='SET competitorPrice = :cp',
                ExpressionAttributeValues={':cp': Decimal(str(competitor_price))}
            )
            
            optimized_price = predict_price(
                demand_score,
                competitor_price,
                current_hour
            )
            
            min_price = competitor_price * 0.95
            max_price = competitor_price * 1.20
            final_price = max(min_price, min(optimized_price, max_price))
            
            table.update_item(
                Key={'productId': product_id},
                UpdateExpression='SET price = :p',
                ExpressionAttributeValues={':p': Decimal(str(final_price))}
            )
            
            updated_count += 1
            print(f"Updated {product_id}: {current_price} -> {final_price}")
            
            if current_hour == 0:
                table.update_item(
                    Key={'productId': product_id},
                    UpdateExpression='SET demandScore = :zero',
                    ExpressionAttributeValues={':zero': Decimal(0)}
                )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Successfully updated {updated_count} products',
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        print(f"Error in price optimizer: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
