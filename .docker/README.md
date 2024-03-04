# [Subjects API](https://github.com/gbv/subjects-api) (Docker)

API to provide information about subject indexing in the K10plus catalog. It is part of a larger infrastructure of [Project coli-conc](https://coli-conc.gbv.de).

- See [GitHub](https://github.com/gbv/subjects-api) for more information about the tool.

## Supported Architectures
Currently, only `x86-64` is supported.

## Available Tags
- The current release version is available under `latest`. However, new major versions might break compatibility of the previously used config file, therefore it is recommended to use a version tag instead.
- We follow SemVer for versioning the application. Therefore, `x` offers the latest image for the major version x, `x.y` offers the latest image for the minor version x.y, and `x.y.z` offers the image for a specific patch version x.y.z.
- Additionally, the latest development version is available under `dev`.

## Usage
It is recommended to run the image using [Docker Compose](https://docs.docker.com/compose/). Note that depending on your system, it might be necessary to use `sudo docker compose`. For older Docker versions, use `docker-compose` instead of `docker compose`.

1. Create `docker-compose.yml`:

```yml
version: "3"

services:
  subjects-api:
    image: ghcr.io/gbv/subjects-api
    volumes:
      - ./data:/data
    environment:
      - NODE_ENV=production
    ports:
      - 3141:3141
    restart: unless-stopped

```

2. Create data folder:

```bash
mkdir -p ./data
```

3. Import the data from TSV:

TODO

<!-- 
```bash
# Move subjects TSV file to mounted data folder
cp subjects.tsv data/subjects.tsv
docker compose run -it subjects-api npm run import -- /data/subjects.tsv
``` -->

4. Start the application:

```bash
docker compose up -d
```

This will create and start a subjects-api container running under host (and guest) port 3141. See [Configuration](#configuration) on how to configure it.

You can now access the application under `http://localhost:3141`.

## Application Setup
After changing `docker-compose.yml` (e.g. adjusting environment variables), it is necessary to recreate the container to apply changes: `docker compose up -d`

### Configuration
The folder `/data` (mounted as `./data` if configured as above) will contain the SQLite database `subjects.db` and related files. You can use environment variables via `environment` to configure subjects-api. Please refer to the [main documentation](../README.md#configuration) for more information and all available options. (Note that paths are always **inside** the container.)
