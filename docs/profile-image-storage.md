# Profile image storage

Profile images are uploaded directly from the web app to an S3-compatible bucket. Configure the API with:

```dotenv
S3_BUCKET=notes-media
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.example.com
S3_PUBLIC_BASE_URL=https://media.example.com/
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
# Set true for providers that require path-style bucket URLs.
S3_FORCE_PATH_STYLE=false
```

`S3_PUBLIC_BASE_URL` must be the public URL prefix for the bucket objects and end up serving keys such as `profile-images/<user-id>/<uuid>.webp`.

Configure the bucket CORS policy to allow `POST` from the web app origin, with the `Content-Type` request header, and expose no credentials. The API creates five-minute, user-scoped presigned POST policies; S3 rejects uploads over 10 MB before writing the object, and the API verifies the type and size again before saving the profile URL.
