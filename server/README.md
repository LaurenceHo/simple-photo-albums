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
   R2_ACCESS_KEY=your_access_key
   R2_SECRET_KEY=your_secret_key
   JWT_SECRET=your_jwt_secret
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   RAPIDAPI_KEY=your_rapidapi_key
   ```

2. Update `wrangler.toml` with your configuration (non-secret values):
   ```toml
   [vars]
   R2_BUCKET_NAME = "your-bucket-name"
   REGION_NAME = "your-region"
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

For existing databases, run the flight columns migration:

```bash
# For local development
wrangler d1 execute photo-albums-db --local --file=./migrations/0001_add_flight_columns.sql

# For production
wrangler d1 execute photo-albums-db --remote --file=./migrations/0001_add_flight_columns.sql
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

- /api/auth/user-info - GET: Get user information
- /api/auth/verify-id-token - POST: Verify user ID token with Firebase by using Google IDP
- /api/auth/logout - POST: User logout

### Album

- /api/albums/:year - GET: Get albums by year
- /api/albums - POST: Create a new album
- /api/albums - PUT: Update an album
- /api/albums - DELETE: Delete an album

### Album tags

- /api/album-tags - GET: Get all album tags
- /api/album-tags - POST: Create a new album tags
- /api/album-tags/:tagId - DELETE: Delete album tag

### Photos

- /api/photos/:year/:albumId - GET: Get photos by album ID
- /api/photos - DELETE: Delete photos
- /api/photos - PUT: Move photos to different folder
- /api/photos/rename - PUT: Rename photo
- /api/photos/upload/:albumId - POST: Upload photos to AWS S3 folder

### Travel Records

- /api/travel-records - GET: Get all travel records
- /api/travel-records - POST: Create a new travel record (supports flight API mode with automatic flight data lookup)
- /api/travel-records/backfill-country - POST: Backfill country data for existing travel records
- /api/travel-records - PUT: Update a travel record
- /api/travel-records/:recordId - DELETE: Delete a travel record

### Location

- /api/location/search - GET: Search location by keyword

### Aggregate

- /api/aggregate/:type - GET: Get aggregate data by type (albums-with-location, count-albums-by-year, featured-albums)
