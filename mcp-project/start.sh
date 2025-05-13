#!/bin/bash
export $(grep -v '^#' .env | xargs)

npx mcp run --config mcp.config.json
