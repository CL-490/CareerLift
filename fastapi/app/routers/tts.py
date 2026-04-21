"""Text-to-speech router. Thin proxy in front of the Kokoro-FastAPI service."""

import asyncio
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tts", tags=["tts"])


async def warmup_kokoro(max_attempts: int = 30, delay: float = 2.0) -> None:
    """Load the Kokoro model + default voice into memory so the first real
    request is fast. Retries until Kokoro becomes reachable or max_attempts
    is exceeded; failure is non-fatal (TTS still works, just cold).
    """
    payload = {
        "model": "kokoro",
        "input": "Ready.",
        "voice": settings.kokoro_voice,
        "response_format": "mp3",
        "speed": 1.0,
    }
    print(f"[kokoro-warmup] starting (voice={settings.kokoro_voice}, url={settings.kokoro_url})", flush=True)
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=5.0)) as client:
        for attempt in range(1, max_attempts + 1):
            try:
                response = await client.post(
                    f"{settings.kokoro_url}/v1/audio/speech",
                    json=payload,
                )
                if response.status_code == 200:
                    print(
                        f"[kokoro-warmup] succeeded on attempt {attempt}",
                        flush=True,
                    )
                    return
                print(
                    f"[kokoro-warmup] attempt {attempt} returned status {response.status_code}",
                    flush=True,
                )
            except httpx.HTTPError as exc:
                print(f"[kokoro-warmup] attempt {attempt} failed: {exc}", flush=True)
            await asyncio.sleep(delay)
    print(
        f"[kokoro-warmup] gave up after {max_attempts} attempts; first user request will be cold.",
        flush=True,
    )


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    voice: str | None = None
    speed: float = Field(1.0, ge=0.5, le=2.0)
    format: Literal["mp3", "wav", "opus", "flac"] = "mp3"


@router.post("/speak")
async def speak(req: SpeakRequest):
    """Stream synthesized speech audio for the given text."""
    payload = {
        "model": "kokoro",
        "input": req.text,
        "voice": req.voice or settings.kokoro_voice,
        "response_format": req.format,
        "speed": req.speed,
    }
    media_type = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "opus": "audio/ogg",
        "flac": "audio/flac",
    }[req.format]

    client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))

    async def iter_audio():
        try:
            async with client.stream(
                "POST",
                f"{settings.kokoro_url}/v1/audio/speech",
                json=payload,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Kokoro TTS error: {body.decode('utf-8', errors='replace')[:200]}",
                    )
                async for chunk in response.aiter_bytes():
                    yield chunk
        finally:
            await client.aclose()

    return StreamingResponse(iter_audio(), media_type=media_type)


@router.get("/voices")
async def list_voices():
    """Proxy Kokoro's voice catalog so the frontend can pick a voice."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(f"{settings.kokoro_url}/v1/audio/voices")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail=f"Kokoro unavailable: {exc}")
