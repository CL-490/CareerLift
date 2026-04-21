CareerLift

Backend (FastAPI)
- Python (Latest) with FastAPI - High-performance async API framework
- Pydantic - Data validation and settings management
- LangChain - LLM orchestration and LLM workflows
- Playwright - Web scraping and automation
- Ollama - Local LLM inference

Database
- Neo4j (Latest) - Graph database for career relationships and paths

**New Feature**: AI mock interview simulator integrated into the Coach Center. Generate role‑level‑aware questions from your resume, receive feedback, and review stored sessions.

Frontend (Next.js)
- Next.js (Latest) - React framework with App Router
- React (Latest) - Latest React with new features
- TypeScript (Latest) - Type-safe development
- Tailwind CSS (Latest) - Utility-first CSS framework
- Axios (Latest) - HTTP client for API calls

Desktop (Electron)
- Electron (Latest) - Cross-platform desktop application wrapper

Mobile (Capacitor)
- Capacitor (Latest) - Cross-platform native runtime for web apps
- Supports iOS and Android builds

Infrastructure
- Docker with BuildKit - Containerization with latest build features
- Docker Compose - Multi-container orchestration

Prerequisites

- Docker Desktop (with BuildKit enabled)
- Node.js (Latest) - for Electron desktop app and Capacitor mobile builds
- Git
- (Optional) Android Studio - for Android builds
- (Optional) Xcode - for iOS builds (macOS only)

Quick Start

1. Clone the repository

```bash
git clone <repository-url>
cd CareerLift
```

2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` if you need to change default values.

3. Pick a Kokoro TTS profile (optional but recommended)

The Mock Interview reads questions aloud via Kokoro-82M. Two Docker profiles
are available; pick one in `.env` via `COMPOSE_PROFILES` (defaults to `cpu`):

```bash
COMPOSE_PROFILES=cpu   # multi-arch image; ARM64-native on Apple Silicon (default)
COMPOSE_PROFILES=gpu   # NVIDIA CUDA image; ~50-200x realtime on a modern GPU
```

Run the detection helper for a recommendation tailored to your host:

```bash
./scripts/kokoro-detect.sh
```

macOS / Apple Silicon users: Docker cannot expose Metal to Linux
containers, so both profiles run on CPU inside Docker. For real Metal
acceleration, run Kokoro natively via `./scripts/kokoro-mlx-native.sh`
(see [docs/TTS.md](docs/TTS.md) if present, or the script's `help`
command).

AMD GPU users: build the community `moritzchow/Kokoro-FastAPI-ROCm` fork
and swap the `kokoro-gpu` service's image locally.

4. Build and start all services with Docker

Standard mode:
```bash
docker compose up --build -d
```

Watch mode (recommended for development):
```bash
docker compose watch
```

Watch mode enables automatic file synchronization and hot-reloading for all services.

5. Access the services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Neo4j Browser: http://localhost:7474
- API Documentation: http://localhost:8000/docs

### Mock Interview

Once a resume has been uploaded, open the Coach Center in the frontend and start an interview. The tool will ask a few questions and evaluate your answers using the LLM. Questions are read aloud via the Kokoro TTS profile you chose in step 3.

6. Pull Ollama model

After services are running, pull an LLM model:

```bash
docker compose exec ollama ollama pull gpt-oss:20b-cloud
```

Desktop Application (Electron)

1. Ensure Docker services are running:
```bash
docker compose up -d
```

2. Install and run Electron:
```bash
cd electronjs
npm install
npm run dev
```

For production builds:
```bash
cd electronjs
npm run build        # Current platform
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:linux  # Linux
```

Mobile Application (Capacitor)

1. Ensure Docker services are running:
```bash
docker compose up -d
```

2. Build the Next.js app and initialize Capacitor:
```bash
cd nextjs
npm install
npm run build
npm run cap:init
```

3. Add platforms:
```bash
npm run cap:sync
```

4. Open in native IDE:
```bash
npm run cap:android  # For Android Studio
npm run cap:ios      # For Xcode (macOS only)
```

Mobile Application (Expo)

1. Install dependencies and start Expo:
```bash
cd expo
npm install
npm run start
```

2. Configure Expo auth environment values in `.env`:
```bash
AUTH_JWT_SECRET=replace-with-openssl-rand-hex-32
BOOTSTRAP_USER_EMAIL=user@careerlift.local
BOOTSTRAP_USER_PASSWORD=changeme
BOOTSTRAP_USER_NAME=user
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=...
EXPO_PUBLIC_MICROSOFT_OAUTH_CLIENT_ID=...
EXPO_PUBLIC_MICROSOFT_TENANT_ID=common
```

3. Restart the FastAPI backend after changing `AUTH_JWT_SECRET` or any `BOOTSTRAP_USER_*` value.

4. The bootstrap email/password login depends on FastAPI being able to mint JWTs. If `AUTH_JWT_SECRET` is blank, the seeded credentials will not work even if the user exists in Neo4j.

5. Make sure your Google and Microsoft OAuth apps allow the Expo redirect scheme:
```text
careerlift-mobile://auth/google
careerlift-mobile://auth/microsoft
```

The Expo app now supports native email/password login plus Google and Microsoft OAuth backed by the same FastAPI auth endpoints used by the web app.

Project Structure

```
CareerLift/
├── fastapi/                # FastAPI backend
│   ├── app/
│   │   ├── core/          # Configuration and database
│   │   ├── models/        # Pydantic models
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI application
│   ├── Dockerfile
│   └── requirements.txt
├── nextjs/                # Next.js frontend + Capacitor
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── public/
│   ├── capacitor.config.ts # Capacitor configuration
│   ├── Dockerfile
│   ├── package.json
│   └── next.config.ts
├── electronjs/            # Electron desktop app
│   ├── main.js           # Electron main process
│   ├── preload.js        # Preload script
│   └── package.json
├── docker-compose.yml    # Multi-container setup
└── README.md
```

Development

Watch Mode

Docker Compose watch mode enables automatic file synchronization and rebuilds:

```bash
docker compose watch
```

This will:
- Sync FastAPI Python files to the container automatically
- Sync Next.js files to the container automatically
- Rebuild FastAPI when requirements.txt changes
- Rebuild Next.js when package.json changes

View Logs

```bash
docker compose logs -f              # All services
docker compose logs -f fastapi      # FastAPI only
docker compose logs -f nextjs       # Next.js only
```

Access Container Shells

```bash
docker compose exec fastapi bash
docker compose exec nextjs sh
```

Testing

Backend Tests

```bash
docker compose exec fastapi pytest
```

Frontend Tests

```bash
docker compose exec nextjs npm test
```

Cleanup

```bash
docker compose down -v
```

Neo4j Database

Default credentials:
- URL: bolt://localhost:7687
- Username: neo4j
- Password: password123

Access Neo4j Browser at http://localhost:7474 to visualize and query your graph data.

LLM Features

- Career Advice: Get personalized career recommendations based on your profile
- Job Analysis: Analyze job descriptions and extract key requirements
- Resume Feedback: Receive LLM-based feedback on your resume
- Web Scraping: Extract job postings and company information from websites

Kokoro TTS profiles

The `kokoro` service is scoped behind docker-compose profiles. Choose one of:

| Profile | Image | Use when |
|---|---|---|
| `cpu` (default) | `ghcr.io/remsky/kokoro-fastapi-cpu:latest` | No GPU, Apple Silicon, or you want the simplest path. Multi-arch, ARM64-native. |
| `gpu` | `ghcr.io/remsky/kokoro-fastapi-gpu:latest` | Linux host with an NVIDIA GPU and `nvidia-container-toolkit` installed. |

Activate by editing `COMPOSE_PROFILES` in `.env` (persistent) or on the command line:

```bash
COMPOSE_PROFILES=gpu docker compose up -d
# or
docker compose --profile gpu up -d
```

Both services share a network alias of `kokoro`, so the backend's `KOKORO_URL=http://kokoro:8880` works unchanged across profiles.

Verify the NVIDIA runtime is wired to Docker before flipping to `gpu`:

```bash
docker run --rm --gpus all nvidia/cuda:12.8.0-base-ubuntu22.04 nvidia-smi
```

Scripts under `scripts/`:

- `kokoro-detect.sh` — probes the host and recommends the right profile.
- `kokoro-mlx-native.sh` — for macOS / Apple Silicon users who want real Metal acceleration; runs Kokoro natively via `mlx-audio` and points `KOKORO_URL` at `host.docker.internal`. Sub-commands: `install`, `run`, `wire`.

Environment Variables

Key environment variables (see `.env.example`):

- `NEO4J_URI`: Neo4j connection string
- `NEO4J_USER`: Neo4j username
- `NEO4J_PASSWORD`: Neo4j password
- `OLLAMA_URL`: Ollama service URL
- `NEXT_PUBLIC_API_URL`: Backend API URL for frontend

API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

License

See [LICENSE](LICENSE) file for details.

Troubleshooting

Docker BuildKit Issues

BuildKit is enabled by default in modern Docker. If you encounter issues:
```bash
docker compose up --build
```

Neo4j Connection Issues

Check if Neo4j is healthy:
```bash
docker compose ps
docker compose logs neo4j
```

Ollama Model Not Found

Pull a model first:
```bash
docker compose exec ollama ollama pull gpt-oss:20b-cloud
```

Port Conflicts

If ports are already in use, modify them in `docker-compose.yml` and `.env`.
