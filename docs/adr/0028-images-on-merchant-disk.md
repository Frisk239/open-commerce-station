# Images live on the merchant’s disk

Product photos and the store logo are files on disk attached to the app (a Docker volume in development). Object storage (OSS, S3) and MinIO are not in the first version. MinIO is out of the first version. A later plugin may speak S3-style APIs; until then do not run a second storage service.

**Status:** accepted

**Considered Options:** disk only; MinIO in Compose from day one; cloud object storage in v1

**Consequences:** Upload writes to a known folder. Backup is that folder plus Postgres. Portal does not ask for bucket keys in v1. MinIO is not required to start; an S3-style plugin can wait.
