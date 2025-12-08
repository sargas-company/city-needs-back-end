init:
	@echo "🧹 Cleaning..."
	rm -rf node_modules
	rm -f package-lock.json
	npm install
	npx prisma generate --config=./prisma.config.ts
	@if [ ! -f .env ]; then cp .env.example .env; fi

	@echo "🐳 Starting Docker containers..."
	@if [ "$$(grep -E '^ENV_MODE=' .env 2>/dev/null | cut -d '=' -f2)" = "production" ]; then \
		cd docker && docker compose --env-file ../.env up -d --build; \
	else \
		cd docker && docker compose --env-file ../.env --profile dev up -d --build; \
	fi

	@echo "⏳ Waiting 20 seconds for containers to be ready..."
	sleep 20

	@echo "🧼 Resetting database (Prisma migrations)..."
	npx prisma migrate reset --force

	@echo "✅ Done."


start:
	@if [ "$$(grep -E '^ENV_MODE=' .env 2>/dev/null | cut -d '=' -f2)" = "production" ]; then \
		cd docker && docker compose --env-file ../.env up -d; \
	else \
		cd docker && docker compose --env-file ../.env --profile dev up -d; \
	fi
	npm run start:dev

start-server-dev:
	@echo "📦 Installing dependencies..."
	npm ci

	@echo "🐳 Starting Docker containers..."
	@if [ "$$(grep -E '^ENV_MODE=' .env 2>/dev/null | cut -d '=' -f2)" = "production" ]; then \
		cd docker && docker compose --env-file ../.env up -d; \
	else \
		cd docker && docker compose --env-file ../.env --profile dev up -d; \
	fi

	@echo "⏳ Waiting 5 seconds for containers to be ready..."
	sleep 5

	@echo "🗄️  Running pending Prisma migrations..."
	npx prisma migrate deploy

	@echo "🛠️  Building application..."
	npm run limited-build

	@echo "🚀 Starting server with PM2..."
	@if pm2 describe webild-backend > /dev/null; then \
	  echo "🔄 Process exists, deleting..."; \
	  pm2 delete webild-backend; \
	fi
	pm2 start dist/src/main.js --name webild-backend
	pm2 save || true

start-server-prod:
	@echo "🐳 Starting monitoring containers (loki, promtail, grafana)..."
	cd docker && docker compose --env-file ../.env up -d loki promtail grafana
	@echo "✅ Monitoring containers started."
