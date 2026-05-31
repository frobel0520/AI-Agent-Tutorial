# Optional Dify stack for Phase 3

Official docs: https://docs.dify.ai/getting-started/install-self-hosted/local-source-code

## Quick start

```powershell
.\scripts\setup-dify.ps1
```

Or manually:

```powershell
git clone https://github.com/langgenius/dify.git C:\Users\ytwei\Projects\dify
cd C:\Users\ytwei\Projects\dify\docker
copy .env.example .env
docker compose up -d
```

## After Dify is running

1. Open http://localhost/install and create admin account
2. Create a Chat App with a simple prompt
3. Publish and copy API Key from API Access
4. Add to this project's `.env`:
   ```
   DIFY_API_BASE=http://localhost/v1
   DIFY_API_KEY=app-...
   ```
5. Call `POST /dify/ask` from Swagger or `/learn` Step 4

Full guide: `deploy/dify-setup.md`

Note: Dify is kept separate from the main compose file because it pulls multiple services and needs its own `.env` bootstrap.
