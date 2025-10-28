import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Products')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        product_id = body['productId']
        
        response = table.update_item(
            Key={'productId': product_id},
            UpdateExpression='SET demandScore = demandScore + :val',
            ExpressionAttributeValues={':val': Decimal(1)},
            ReturnValues='UPDATED_NEW'
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'message': 'Demand updated',
                'newDemandScore': float(response['Attributes']['demandScore'])
            })
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
