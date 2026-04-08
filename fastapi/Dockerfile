# syntax=docker/dockerfile:1

FROM python:3.12-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build tools + curl for Tectonic download
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl

ARG TARGETARCH
RUN if [ "$TARGETARCH" = "arm64" ]; then \
      TECTONIC_ARCH="aarch64-unknown-linux-musl"; \
    else \
      TECTONIC_ARCH="x86_64-unknown-linux-gnu"; \
    fi && \
    curl -sSL "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-${TECTONIC_ARCH}.tar.gz" \
    -o /tmp/tectonic.tar.gz \
    && tar xz -C /usr/local/bin/ -f /tmp/tectonic.tar.gz \
    && rm /tmp/tectonic.tar.gz

# Install Python dependencies (cache mount persists across builds)
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Production stage
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy installed packages from builder
COPY --link --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --link --from=builder /usr/local/bin /usr/local/bin

# Install runtime dependencies: fonts for LaTeX
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    libgraphite2-3 \
    fonts-lato \
    fonts-texgyre

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
