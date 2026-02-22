# Cloudflare Workers with Hono

## Prerequisites

### Cloudflare Account and Wrangler

1. Create a [Cloudflare account](https://dash.cloudflare.com/sign-up).
2. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```
3. Login to Cloudflare:
   ```bash
   wrangler login
   ```

### Create an AWS user in IAM

You will need to create an AWS user in IAM with permissions to access S3. This user will be used by the Worker to upload and manage photos.

Your AWS user needs to have the following permissions:

1. S3: PutObject, GetObject, DeleteObject, ListBucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": "*"
    }
  ]
}
```

Once you create it, download the access key and secret key. You will need them for your `.dev.vars` file.

### Create S3 Bucket

You need to manually create an S3 bucket in your AWS console. This bucket will be used to store photos.
Make sure to configure CORS to allow requests from your Cloudflare Worker and local development environment.

### Cloudflare D1 Database

You need to create a D1 database for your project.

1. Create a database:
   ```bash
   wrangler d1 create photo-albums-db
   ```
2. Note the `database_name` and `database_id` from the output. You will need to update your `wrangler.toml` with these values.

## Setup

### Install dependencies

```bash
bun install
```

### Environment Variables

1. Create a `.dev.vars` file in the `server` directory for your local secrets:

   ```properties
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   JWT_SECRET=your_jwt_secret
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

2. Update `wrangler.toml` with your configuration (non-secret values):
   ```toml
   [vars]
   AWS_S3_BUCKET_NAME = "your-bucket-name"
   AWS_REGION_NAME = "your-region"
   VITE_IMAGEKIT_CDN_URL = "your-imagekit-url"
   ALBUM_URL = "http://localhost:5173"
   ```

### Database Migration

Run the migrations to set up your database schema:

```bash
# For local development
wrangler d1 execute photo-albums-db --local --file=./migrations/0000_initial.sql

# For production
wrangler d1 execute photo-albums-db --remote --file=./migrations/0000_initial.sql
```

## Local development

### Run the worker locally

```bash
bun run start:wrangler
```

This command runs `wrangler dev --local`, which starts the worker on a local server.

### Run unit tests

```bash
bun run test:unit
```

## Deployment

To deploy your worker to Cloudflare:

```bash
bun run deploy
```

## API endpoint list

### Authentication

- /api/auth/userInfo - GET: Get user information
- /api/auth/verifyIdToken - POST: Verify user ID token with Firebase by using Google IDP
- /api/auth/logout - POST: User logout

### Album

- /api/albums/:year - GET: Get albums by year
- /api/albums - POST: Create a new album
- /api/albums - PUT: Update an album
- /api/albums - DELETE: Delete an album

### Album tags

- /api/albumTags - GET: Get all album tags
- /api/albumTags - POST: Create a new album tags
- /api/albumTags/:tagId - DELETE: Delete album tag

### Photos

- /api/photos/:year/:albumId - GET: Get photos by album ID
- /api/photos - DELETE: Delete photos
- /api/photos - PUT: Move photos to different folder
- /api/photos/rename - PUT: Rename photo
- /api/photos/upload/:albumId - POST: Upload photos to AWS S3 folder

### Location

- /api/location/search - GET: Search location by keyword

### Aggregate

- /api/aggregate/:type - GET: Get aggregate data by type
