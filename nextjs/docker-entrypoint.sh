#!/bin/sh
set -e

# Ensure node_modules binaries are executable (volume mount can strip permissions)
chmod +x node_modules/.bin/* 2>/dev/null || true

exec "$@"
