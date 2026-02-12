CareerLift

Backend (FastAPI)
- Python (Latest) with FastAPI - High-performance async API framework
- Pydantic - Data validation and settings management
- LangChain - LLM orchestration and LLM workflows
- Playwright - Web scraping and automation
- Ollama - Local LLM inference

Database
- Neo4j (Latest) - Graph database for career relationships and paths

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

3. Build and start all services with Docker

Standard mode:
```bash
docker compose up --build -d
```

Watch mode (recommended for development):
```bash
docker compose watch
```

Watch mode enables automatic file synchronization and hot-reloading for all services.

4. Access the services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Neo4j Browser: http://localhost:7474
- API Documentation: http://localhost:8000/docs

5. Pull Ollama model

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