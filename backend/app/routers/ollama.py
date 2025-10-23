"""Ollama service API endpoints."""
from fastapi import APIRouter, HTTPException
from app.core.config import settings
import httpx
import docker
import asyncio
import re


router = APIRouter(prefix="/api/ollama", tags=["ollama"])


@router.get("/status")
async def get_ollama_status():
    """
    Get Ollama model status and signin information.

    Returns current model, signin status, and signin URL if needed.
    """
    try:
        current_model = settings.ollama_model
        ollama_url = settings.ollama_url

        # Try to get tags (list of models) from Ollama API
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(f"{ollama_url}/api/tags")

                if response.status_code == 200:
                    data = response.json()
                    models = [model["name"] for model in data.get("models", [])]
                    model_available = current_model in models
                    signin_required = False
                    signin_url = None
                elif response.status_code == 401:
                    # Unauthorized - signin required
                    models = []
                    model_available = False
                    signin_required = True

                    # Try to get signin URL from error response
                    try:
                        error_data = response.json()
                        signin_url = error_data.get("signin_url")
                    except:
                        signin_url = None
                else:
                    models = []
                    model_available = False
                    signin_required = False
                    signin_url = None

            except httpx.TimeoutException:
                return {
                    "current_model": current_model,
                    "model_available": False,
                    "signin_required": False,
                    "signin_url": None,
                    "available_models": [],
                    "error": "Ollama service timeout"
                }
            except Exception as e:
                return {
                    "current_model": current_model,
                    "model_available": False,
                    "signin_required": False,
                    "signin_url": None,
                    "available_models": [],
                    "error": str(e)
                }

        return {
            "current_model": current_model,
            "model_available": model_available,
            "signin_required": signin_required,
            "signin_url": signin_url,
            "available_models": models
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking Ollama status: {str(e)}")


@router.post("/signin")
async def signin_ollama():
    """
    Initiate Ollama Cloud signin process.

    Signs out first (if signed in), then runs 'ollama signin' command
    in the container and returns the signin URL.
    """
    try:
        # Connect to Docker daemon
        client = docker.from_env()

        # Get the Ollama container
        try:
            container = client.containers.get("ollama")
        except docker.errors.NotFound:
            raise HTTPException(status_code=404, detail="Ollama container not found")

        # First, sign out to clear existing authentication
        def run_signout():
            exec_result = container.exec_run("ollama signout", demux=True)
            return exec_result.exit_code

        # Run signout (ignore errors if not signed in)
        await asyncio.to_thread(run_signout)

        # Then run 'ollama signin' command to get new signin URL
        def run_signin():
            exec_result = container.exec_run("ollama signin", demux=True)
            stdout, stderr = exec_result.output
            return stdout.decode() if stdout else "", stderr.decode() if stderr else ""

        # Run in thread pool since docker client is synchronous
        stdout, stderr = await asyncio.to_thread(run_signin)

        # The signin command outputs the URL in stdout
        # Format: "To sign in, navigate to:\n    https://..."
        signin_url = None
        for line in stdout.split('\n'):
            if 'http' in line.lower():
                # Extract URL from the line
                url_match = re.search(r'https?://[^\s]+', line)
                if url_match:
                    signin_url = url_match.group(0)
                    break

        if signin_url:
            return {
                "message": "Signin URL generated",
                "signin_url": signin_url
            }
        else:
            # If we couldn't extract URL from stdout, return error info
            raise HTTPException(
                status_code=500,
                detail=f"Could not extract signin URL. Output: {stdout}, Error: {stderr}"
            )

    except docker.errors.DockerException as e:
        raise HTTPException(status_code=500, detail=f"Docker error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running signin: {str(e)}")
