SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
.DEFAULT_GOAL := help
.PHONY: help install dev build start typecheck lint format test lhci deploy sync
# Show available commands
help:
	@awk '/^# / { description = substr($$0, 3); next } /^[a-zA-Z][a-zA-Z0-9_-]*:/ { if (description != "") printf "  %-14s %s\n", substr($$1, 1, length($$1)-1), description; description = "" }' "$(ROOT)/Makefile"
# Setup: install pinned Bun dependencies
install:
	@cd "$(ROOT)" && bun install --frozen-lockfile
# App: run development server
dev:
	@cd "$(ROOT)" && bun run dev
# App: export production website and security headers
build:
	@cd "$(ROOT)" && bun run build
# App: preview static export locally
start:
	@cd "$(ROOT)" && bun run start
# Quality: check TypeScript
typecheck:
	@cd "$(ROOT)" && bun run typecheck
# Quality: check Biome without modifying source
lint:
	@cd "$(ROOT)" && bun run lint
# Quality: format source with Biome
format:
	@cd "$(ROOT)" && bun run format
# Test: run browser and accessibility tests
test:
	@cd "$(ROOT)" && bun run test:e2e
# Test: measure Lighthouse budgets
lhci:
	@cd "$(ROOT)" && bun run lhci
# Deploy: build and atomically activate on the standalone Linux server
deploy:
	@cd "$(ROOT)" && bash deploy/deploy.sh
# Deploy: fast-forward main and deploy on the standalone server
sync:
	@cd "$(ROOT)" && git pull --ff-only origin main && $(MAKE) deploy
