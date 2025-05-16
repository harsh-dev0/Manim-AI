# Manim AI Deployment Guide

This guide will walk you through deploying the Manim AI application to the cloud using free services.

## Overview

The deployment consists of two parts:
1. **Frontend**: Deployed to Netlify (free tier)
2. **Backend**: Deployed to Render.com (free tier)
3. **Storage**: AWS S3 (free tier) for video storage

## Step 1: Set up AWS S3 for Video Storage

1. Log in to your AWS account or create one at https://aws.amazon.com/
2. Create an S3 bucket:
   - Go to S3 service
   - Click "Create bucket"
   - Name your bucket (e.g., `manim-ai-videos`)
   - Select a region (e.g., `us-east-1`)
   - Uncheck "Block all public access" (since we need public access to videos)
   - Enable ACLs and select "Bucket owner preferred"
   - Create the bucket

3. Set up bucket policy to allow public read access:
   - Go to your bucket
   - Click on "Permissions" tab
   - Under "Bucket Policy", click "Edit" and add:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```
   - Replace `YOUR-BUCKET-NAME` with your actual bucket name

4. Create an IAM user for programmatic access:
   - Go to IAM service
   - Click "Users" > "Add users"
   - Name: `manim-ai-app`
   - Select "Access key - Programmatic access"
   - Attach policy: "AmazonS3FullAccess"
   - Create user and save the Access Key ID and Secret Access Key

## Step 2: Deploy the Backend to Render.com

1. Sign up for a free account at https://render.com/
2. Connect your GitHub account
3. Create a new Web Service:
   - Click "New +" > "Web Service"
   - Connect your GitHub repository
   - Name: `manim-ai-backend`
   - Environment: Python
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Select Free plan

4. Add environment variables:
   - ANTHROPIC_API_KEY: Your Anthropic API key
   - AWS_ACCESS_KEY_ID: Your AWS Access Key ID from Step 1
   - AWS_SECRET_ACCESS_KEY: Your AWS Secret Access Key from Step 1
   - S3_BUCKET_NAME: Your S3 bucket name (e.g., `manim-ai-videos`)
   - AWS_REGION: Your selected AWS region (e.g., `us-east-1`)

5. Deploy the service and note the URL (e.g., `https://manim-ai-backend.onrender.com`)

## Step 3: Deploy the Frontend to Netlify

1. Sign up for a free account at https://netlify.com/
2. Connect your GitHub account
3. Create a new site:
   - Click "New site from Git"
   - Select GitHub and your repository
   - Build command: `npm run build`
   - Publish directory: `.next`

4. Add environment variables:
   - NEXT_PUBLIC_API_URL: Your backend URL from Step 2 (e.g., `https://manim-ai-backend.onrender.com`)

5. Deploy the site

## Step 4: Test the Deployment

1. Visit your Netlify site URL
2. Try generating a new animation
3. Verify that the video plays correctly
4. Check that videos are being stored in your S3 bucket

## Troubleshooting

If you encounter any issues:

1. **Frontend can't connect to backend**: Check the NEXT_PUBLIC_API_URL environment variable
2. **Videos not uploading to S3**: Verify AWS credentials and bucket permissions
3. **Manim rendering errors**: Check Render.com logs for any Python errors

## Maintenance

- AWS Free Tier: Includes 5GB of S3 storage and 20,000 GET requests per month
- Render.com Free Tier: 750 hours of runtime per month
- Netlify Free Tier: 100GB bandwidth per month

Monitor your usage to stay within free tier limits.
