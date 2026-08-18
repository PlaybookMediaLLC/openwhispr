# Thin wrapper around bin/openwhispr, mirroring screenshot-studio's Makefile.
# Fork-owned file: upstream has no Makefile, so merges stay clean.

.PHONY: help up setup doctor status check clean reset

help: ## Show local development commands.
	@bin/openwhispr help

up: ## Start the full dev environment.
	@bin/openwhispr up

setup: ## Install deps, compile natives, download runtimes.
	@bin/openwhispr setup

doctor: ## Diagnose the machine.
	@bin/openwhispr doctor

status: ## Show what is installed and downloaded.
	@bin/openwhispr status

check: ## Run lint, typecheck, and tests.
	@bin/openwhispr check

clean: ## Remove build output.
	@bin/openwhispr clean

reset: ## clean + remove node_modules.
	@bin/openwhispr reset
