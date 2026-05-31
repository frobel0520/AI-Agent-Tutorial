# Start Ollama via Docker and pull the default tutorial model.
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot\..

Write-Host "==> Checking Docker..."
docker info | Out-Null

Write-Host "==> Starting Ollama container..."
docker compose up -d ollama

Write-Host "==> Pulling model llama3.2 (first run may take several minutes)..."
docker compose exec ollama ollama pull llama3.2

Write-Host ""
Write-Host "Done. Update your .env:"
Write-Host "  LLM_PROVIDER=ollama"
Write-Host "  OLLAMA_BASE_URL=http://localhost:11434"
Write-Host "  OLLAMA_MODEL=llama3.2"
Write-Host ""
Write-Host "Then run: python src\run.py"
Write-Host "Open: http://localhost:8000/learn"
