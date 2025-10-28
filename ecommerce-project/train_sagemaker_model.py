import boto3
import sagemaker
from sagemaker.estimator import Estimator
from sagemaker import image_uris
from sagemaker.inputs import TrainingInput  # THIS IS THE KEY FIX
import time

print("Starting SageMaker training setup...")

# Configuration - REPLACE THESE VALUES
REGION = 'us-east-1'
BUCKET_NAME = 'ecommerce-ml-data-mithunveluru4934'  # REPLACE
ACCOUNT_ID = '164971840297'  # REPLACE (12-digit number)
ROLE_ARN = f'arn:aws:iam::{ACCOUNT_ID}:role/SageMakerEcommerceRole'

# Initialize SageMaker session
print("Initializing SageMaker session...")
boto_session = boto3.Session(region_name=REGION)
sagemaker_session = sagemaker.Session(boto_session=boto_session)

# Get the Linear Learner container image
print("Getting Linear Learner container...")
container = image_uris.retrieve('linear-learner', REGION)
print(f"Container image: {container}")

# S3 paths
train_data_path = f's3://{BUCKET_NAME}/sagemaker/train/training-data.csv'
output_location = f's3://{BUCKET_NAME}/sagemaker/output'

print(f"Training data: {train_data_path}")
print(f"Output location: {output_location}")
print(f"Using IAM role: {ROLE_ARN}")

# Create estimator
print("\nCreating SageMaker estimator...")
linear = Estimator(
    image_uri=container,
    role=ROLE_ARN,
    instance_count=1,
    instance_type='ml.m4.xlarge',
    output_path=output_location,
    sagemaker_session=sagemaker_session,
    base_job_name='price-optimization'
)

# Set hyperparameters for regression
print("Setting hyperparameters...")
linear.set_hyperparameters(
    feature_dim=3,  # demandScore, competitorPrice, timeOfDay
    predictor_type='regressor',
    mini_batch_size=10,
    epochs=10,
    learning_rate=0.01
)

# ****** THIS IS THE FIX ******
# Specify CSV content type for training data
train_input = TrainingInput(
    s3_data=train_data_path,
    content_type='text/csv'  # Tell SageMaker this is CSV, not RecordIO
)

print("\n" + "="*50)
print("STARTING TRAINING JOB...")
print("This will take 5-10 minutes. Please wait...")
print("="*50 + "\n")

try:
    # Use the TrainingInput object instead of just the string path
    linear.fit({'train': train_input}, wait=True, logs='All')
    
    print("\n✅ Training completed successfully!")
    
    # Get model artifacts location
    model_data = linear.model_data
    print(f"\nModel artifacts saved to: {model_data}")
    
except Exception as e:
    print(f"\n❌ Training failed: {str(e)}")
    print("\nTroubleshooting:")
    print("1. Verify CSV file exists in S3")
    print("2. Check CSV format (no headers, label in first column)")
    print("3. Check IAM role permissions")
    exit(1)

# Deploy the model to an endpoint
print("\n" + "="*50)
print("DEPLOYING MODEL TO ENDPOINT...")
print("This will take 5-8 minutes. Please wait...")
print("="*50 + "\n")

try:
    predictor = linear.deploy(
        initial_instance_count=1,
        instance_type='ml.t2.medium',
        endpoint_name='price-optimization-endpoint'
    )
    
    print("\n✅ Model deployed successfully!")
    print(f"Endpoint name: price-optimization-endpoint")
    print(f"Endpoint status: InService")
    
    print("\n" + "="*50)
    print("✅ SETUP COMPLETE!")
    print("="*50)
    print("\nYour SageMaker model is now trained and deployed.")
    print("You can now proceed to Step 6 (Create Lambda Functions).")
    print("\nIMPORTANT: To avoid charges, delete the endpoint when done:")
    print("  aws sagemaker delete-endpoint --endpoint-name price-optimization-endpoint")
    
except Exception as e:
    print(f"\n❌ Deployment failed: {str(e)}")
    print("Training was successful, but deployment failed.")
    exit(1)
