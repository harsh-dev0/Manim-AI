from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file
from s3_storage import S3Storage
import os
import random
import string

def create_test_file():
    """Create a small test file with random content"""
    content = ''.join(random.choices(string.ascii_letters + string.digits, k=100))
    filename = 'test_file.txt'
    
    with open(filename, 'w') as f:
        f.write(content)
    
    return filename

def test_s3_connection():
    """Test S3 connection and bucket accessibility"""
    print("\n=== S3 Connection Test ===")
    
    # Check if environment variables are set
    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    bucket_name = os.environ.get("S3_BUCKET_NAME")
    aws_region = os.environ.get("AWS_REGION", "us-east-1")
    
    if not aws_access_key or not aws_secret_key or not bucket_name:
        print("❌ ERROR: Missing required environment variables")
        print(f"  - AWS_ACCESS_KEY_ID: {'✓' if aws_access_key else '❌'}")
        print(f"  - AWS_SECRET_ACCESS_KEY: {'✓' if aws_secret_key else '❌'}")
        print(f"  - S3_BUCKET_NAME: {'✓' if bucket_name else '❌'}")
        print(f"  - AWS_REGION: {aws_region}")
        return False
    
    print(f"✓ Environment variables detected")
    print(f"  - Bucket name: {bucket_name}")
    print(f"  - Region: {aws_region}")
    
    # Initialize S3 storage
    s3_storage = S3Storage()
    
    if not s3_storage.is_enabled:
        print("❌ ERROR: S3 storage failed to initialize")
        return False
    
    print("✓ S3 client initialized successfully")
    
    # Create a test file
    test_file = create_test_file()
    print(f"✓ Created test file: {test_file}")
    
    # Upload test file
    s3_key = f"test/{test_file}"
    upload_url = s3_storage.upload_file(test_file, s3_key)
    
    if upload_url:
        print(f"✓ Upload successful!")
        print(f"✓ File accessible at: {upload_url}")
        print("\nYour S3 bucket is properly configured! 🎉")
        
        # Clean up the test file
        os.remove(test_file)
        return True
    else:
        print("❌ ERROR: Failed to upload test file to S3")
        print("\nTroubleshooting tips:")
        print("1. Check that your AWS credentials are correct")
        print("2. Verify that the bucket exists and is in the specified region")
        print("3. Ensure that the IAM user has permissions to write to the bucket")
        print("4. Check if your bucket policy allows PutObject operations")
        
        # Clean up the test file
        os.remove(test_file)
        return False

if __name__ == "__main__":
    test_s3_connection()