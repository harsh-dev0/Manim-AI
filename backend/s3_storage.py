from dotenv import load_dotenv
load_dotenv()
import os
import boto3
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class S3Storage:
    def __init__(self):
        self.is_enabled = False
        self.s3_client = None
        self.bucket_name = None
        
        try:
            aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
            self.bucket_name = os.environ.get("S3_BUCKET_NAME")
            aws_region = os.environ.get("AWS_REGION", "us-east-1")
            
            if aws_access_key and aws_secret_key and self.bucket_name:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=aws_region
                )
                self.is_enabled = True
                logger.info(f"S3 storage initialized with bucket: {self.bucket_name}")
            else:
                logger.warning("S3 storage not configured, using local storage")
        except Exception as e:
            logger.error(f"Error initializing S3 storage: {e}")
    
    def upload_file(self, local_file_path, s3_key):
        logger.info(f"S3 upload requested for file: {local_file_path} to key: {s3_key}")
        
        if not self.is_enabled:
            logger.info(f"S3 storage not enabled, skipping upload of {local_file_path}")
            return None
        
        logger.info(f"Starting S3 upload to bucket: {self.bucket_name}")
        
        try:
            if not os.path.exists(local_file_path):
                logger.error(f"Local file does not exist: {local_file_path}")
                return None
                
            logger.info(f"File exists, size: {os.path.getsize(local_file_path)} bytes")
            
            self.s3_client.upload_file(
                local_file_path,
                self.bucket_name,
                s3_key
            )
            
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            logger.info(f"Successfully uploaded {local_file_path} to S3: {url}")
            return url
        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return None
            
    def get_url(self, s3_key):
        if not self.is_enabled:
            return None
            
        return f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
