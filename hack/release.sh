#!/usr/bin/env bash
set -euo pipefail

go test ./...
npm run test:fixtures
goreleaser release --clean
