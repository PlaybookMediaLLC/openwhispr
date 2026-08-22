COMPOSE := docker compose -f compose.yaml
ROOT := ../..
OPPULENCE_VOICE_API_PORT ?= 28080
API_URL ?= http://127.0.0.1:$(OPPULENCE_VOICE_API_PORT)
export OPPULENCE_VOICE_API_PORT

.PHONY: pull up up-tools down reset logs smoke dev

pull:
	$(COMPOSE) pull
	$(COMPOSE) images

up:
	$(COMPOSE) up -d --wait
	$(COMPOSE) images

up-tools:
	$(COMPOSE) --profile tools up -d --wait
	$(COMPOSE) images

down:
	$(COMPOSE) down

reset:
	@echo "Removing only Oppulence Voice local containers and named development volumes."
	$(COMPOSE) down --volumes

logs:
	$(COMPOSE) logs -f api worker temporal

smoke:
	cd $(ROOT) && API_URL=$(API_URL) node --import tsx distributions/oppulence-voice/scripts/backend-smoke.ts

dev: up
	cd $(ROOT) && OPPULENCE_VOICE_API_URL=$(API_URL) npm run dev:oppulence
