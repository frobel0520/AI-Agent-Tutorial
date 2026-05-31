# Clone official Dify docker stack and start containers (Phase 3).
$ErrorActionPreference = "Stop"

$DifyRoot = "C:\Users\ytwei\Projects\dify"
$DifyDocker = Join-Path $DifyRoot "docker"

Write-Host "==> Checking Docker..."
docker info | Out-Null

if (-not (Test-Path $DifyRoot)) {
    Write-Host "==> Cloning Dify repo (may take a few minutes)..."
    git clone --depth 1 https://github.com/langgenius/dify.git $DifyRoot
} else {
    Write-Host "==> Dify repo already exists at $DifyRoot"
}

Set-Location $DifyDocker

if (-not (Test-Path ".env")) {
    Write-Host "==> Creating docker/.env from .env.example..."
    Copy-Item ".env.example" ".env"
}

Write-Host "==> Starting Dify containers (first run pulls many images)..."
docker compose up -d

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1. Open http://localhost/install and create admin account"
Write-Host "  2. Create a Chat App (聊天助手) with a simple system prompt"
Write-Host "  3. Publish the app, then copy API Key from API Access"
Write-Host "  4. Add to AI-Agent-Tutorial .env:"
Write-Host "       DIFY_API_BASE=http://localhost/v1"
Write-Host "       DIFY_API_KEY=app-xxxxxxxx"
Write-Host "  5. Restart API: python src\run.py"
Write-Host "  6. Test: POST http://localhost:8000/dify/ask or /learn Step 4"
Write-Host ""
Write-Host "Full guide: deploy/dify-setup.md"
