# Optional Dify stack for Phase 3.
# Official docs: https://docs.dify.ai/getting-started/install-self-hosted/local-source-code
#
# Quick start (requires clone of Dify repo):
#   git clone https://github.com/langgenius/dify.git
#   cd dify/docker
#   cp .env.example .env
#   docker compose up -d
#
# After Dify is running:
# 1. Open http://localhost/install and create admin account
# 2. Create a Chat App with a simple prompt
# 3. Copy API Key + App ID into this project's .env:
#      DIFY_API_BASE=http://localhost/v1
#      DIFY_API_KEY=app-...
#      DIFY_APP_ID=<your-app-id-if-needed>
# 4. Call POST /dify/ask from Swagger UI
#
# Note: Dify is intentionally kept separate from the main compose file
# because it pulls multiple services and needs its own .env bootstrap.
