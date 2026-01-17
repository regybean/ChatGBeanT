#!/bin/bash

# Check if TURBO_REMOTE_CACHE_SIGNATURE_KEY is set
if [ -z "$TURBO_REMOTE_CACHE_SIGNATURE_KEY" ]; then
  echo ""
  echo "  WARNING: Remote cache not configured."
  echo "  Set TURBO_REMOTE_CACHE_SIGNATURE_KEY for faster builds."
  echo "  See: https://turbo.build/repo/docs/core-concepts/remote-caching"
  echo ""
fi
