# Testing Guide for CareerLift

This guide provides comprehensive instructions for testing all components of the CareerLift stack.

Prerequisites

Ensure Docker is running:
```bash
docker --version
docker compose --version
```

Step 1: Start Docker Services

Build and start all services:

```bash
docker compose up --build -d
```

Or use watch mode for development:

```bash
docker compose watch
```

Check service status

```bash
docker compose ps
```

Expected output: All services should be "Up" and "healthy"

Step 2: Test Neo4j Database

Access Neo4j Browser

Open http://localhost:7474 in your browser

Login credentials:
- URL: `bolt://localhost:7687`
- Username: `neo4j`
- Password: `password123`

Test with Cypher query

```cypher
CREATE (n:Test {name: 'CareerLift'})
RETURN n
```

Verify from command line

```bash
docker compose exec neo4j cypher-shell -u neo4j -p password123 "RETURN 'Neo4j Connected!' as message"
```

Step 3: Test Ollama LLM Service

Check Ollama is running

```bash
curl http://localhost:11434/api/tags
```

Pull a model

```bash
docker compose exec ollama ollama pull llama2
```

Or for better performance (requires more RAM):
```bash
docker compose exec ollama ollama pull gpt-oss:20b-cloud
```

Test model inference

```bash
docker compose exec ollama ollama run llama2 "Hello, tell me about career development in one sentence."
```

List available models

```bash
docker compose exec ollama ollama list
```

Step 4: Test Backend API

Check backend health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "neo4j": "connected",
    "ollama": "available",
    "playwright": "initialized"
  }
}
```

Test root endpoint

```bash
curl http://localhost:8000/
```

Access API documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Test creating a career goal

```bash
curl -X POST "http://localhost:8000/career/goals" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Become a Senior Software Engineer",
    "description": "Advance to senior level within 2 years",
    "target_role": "Senior Software Engineer",
    "target_company": "Tech Company"
  }'
```

Test getting career goals

```bash
curl http://localhost:8000/career/goals
```

Test adding a skill

```bash
curl -X POST "http://localhost:8000/career/skills" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Python",
    "category": "Programming",
    "proficiency_level": 4
  }'
```

Test LLM career advice

```bash
curl -X GET "http://localhost:8000/career/advice?current_role=Junior%20Developer&target_role=Senior%20Developer&skills=Python,JavaScript&experience_years=2"
```

Test job description analysis

```bash
curl -X POST "http://localhost:8000/career/analyze-job?job_description=We%20are%20looking%20for%20a%20Python%20developer%20with%205%20years%20experience"
```

Test web scraping (optional - use a real URL)

```bash
curl -X POST "http://localhost:8000/scraper/extract-text?url=https://example.com"
```

Step 5: Test Frontend

Check frontend is running

```bash
curl -I http://localhost:3000
```

Access in browser

Open http://localhost:3000

You should see the CareerLift landing page with:
- System status showing "connected"
- Service health indicators
- Navigation buttons

Test API connection from frontend

The homepage should automatically check the backend API and display connection status.

Step 6: Test Backend with pytest

Run all tests

```bash
docker compose exec backend pytest -v
```

Run tests with coverage

```bash
docker compose exec backend pytest --cov=app --cov-report=html
```

View coverage report

Coverage HTML report will be in `backend/htmlcov/index.html`

Step 7: Test Electron Desktop App

Prerequisites

1. Frontend must be running on http://localhost:3000
2. Backend must be running on http://localhost:8000

Install Electron dependencies

```bash
cd electron
npm install
```

Run in development mode

```bash
npm run dev
```

The desktop application should open and load the Next.js frontend.

Test desktop features

- Window should be 1400x900 pixels
- Should be resizable with min size 800x600
- Menu bar should be functional
- DevTools should be available in development mode

Step 8: Integration Testing

Test complete workflow

1. Create a career goal via API or frontend
2. Add skills to your profile
3. Request LLM advice with your current and target roles
4. Analyze a job description
5. Verify data in Neo4j Browser

Example integration test script

```bash
#!/bin/bash

echo "Testing CareerLift Integration..."

# 1. Health check
echo "1. Checking backend health..."
curl -s http://localhost:8000/health | jq

# 2. Create goal
echo "2. Creating career goal..."
curl -s -X POST "http://localhost:8000/career/goals" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Goal","description":"Integration test","target_role":"Engineer"}' | jq

# 3. Add skill
echo "3. Adding skill..."
curl -s -X POST "http://localhost:8000/career/skills" \
  -H "Content-Type: application/json" \
  -d '{"name":"Testing","category":"QA","proficiency_level":5}' | jq

# 4. Get advice
echo "4. Getting LLM advice..."
curl -s "http://localhost:8000/career/advice?current_role=Developer&target_role=Senior&skills=Python&experience_years=3" | jq

echo "Integration test complete!"
```

Step 9: Performance Testing

Test backend response times

```bash
# Install Apache Bench if not available
# brew install httpd (macOS)
# sudo apt-get install apache2-utils (Linux)

ab -n 100 -c 10 http://localhost:8000/health
```

Monitor container resources

```bash
docker stats
```

Check logs for errors

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f neo4j
docker compose logs -f ollama
```

Step 10: Cleanup and Reset

Stop all services

```bash
docker compose down
```

Remove all data (including databases)

```bash
docker compose down -v
```

Clean Docker system

```bash
docker system prune -f
```

Restart fresh

```bash
docker compose down -v
docker compose up --build -d
```

Troubleshooting Tests

Backend fails to start

```bash
docker compose logs backend
# Check for Python errors or missing dependencies
```

Neo4j connection timeout

```bash
docker compose exec neo4j cypher-shell -u neo4j -p password123 "RETURN 1"
# Verify credentials and wait for healthcheck to pass
```

Ollama model not responding

```bash
docker compose exec ollama ollama list
# Ensure a model is pulled
docker compose exec ollama ollama pull llama2
```

Frontend cannot connect to backend

```bash
# Check environment variables
docker compose exec frontend env | grep NEXT_PUBLIC_API_URL
# Should be http://localhost:8000
```

Port conflicts

```bash
# Check what's using the ports
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
lsof -i :7474  # Neo4j HTTP
lsof -i :7687  # Neo4j Bolt
lsof -i :11434 # Ollama
```

Automated Testing Script

Save this as `test-all.sh`:

```bash
#!/bin/bash
set -e

echo "CareerLift Automated Test Suite"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_service() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}[PASS]${NC} $1"
  else
    echo -e "${RED}[FAIL]${NC} $1"
    exit 1
  fi
}

echo ""
echo "1. Testing Neo4j..."
curl -s -f http://localhost:7474 > /dev/null
test_service "Neo4j HTTP interface"

echo ""
echo "2. Testing Ollama..."
curl -s -f http://localhost:11434/api/tags > /dev/null
test_service "Ollama API"

echo ""
echo "3. Testing Backend..."
curl -s -f http://localhost:8000/health > /dev/null
test_service "Backend health endpoint"

curl -s http://localhost:8000/ | jq -e '.version' > /dev/null
test_service "Backend root endpoint"

echo ""
echo "4. Testing Frontend..."
curl -s -f http://localhost:3000 > /dev/null
test_service "Frontend homepage"

echo ""
echo "5. Testing Backend pytest..."
docker compose exec -T backend pytest -v
test_service "Backend unit tests"

echo ""
echo -e "${GREEN}=================================="
echo "All tests passed!"
echo -e "==================================${NC}"
```

Make it executable and run:
```bash
chmod +x test-all.sh
./test-all.sh
```

Success Criteria

All tests pass if:

- [x] All Docker containers are running and healthy
- [x] Neo4j accepts connections and queries
- [x] Ollama has at least one model and responds to prompts
- [x] Backend API returns healthy status
- [x] Backend can create/read from Neo4j
- [x] Backend LLM endpoints return responses
- [x] Frontend loads and displays correctly
- [x] Frontend can communicate with backend
- [x] Electron app opens and loads frontend
- [x] All pytest tests pass

Next Steps

After successful testing:

1. Review logs for any warnings
2. Optimize Ollama model selection for your use case
3. Add custom Neo4j graph schemas
4. Extend frontend with more features
5. Configure production deployment
6. Set up CI/CD pipelines
