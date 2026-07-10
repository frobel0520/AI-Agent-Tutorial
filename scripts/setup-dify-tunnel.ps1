# Expose local Dify (nginx on port 80) via Cloudflare Quick Tunnel (free).
$ErrorActionPreference = "Stop"

Write-Host "==> Checking cloudflared..."
$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "cloudflared not found. Install:"
    Write-Host "  winget install Cloudflare.cloudflared"
    Write-Host "  or https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
}

Write-Host "==> Checking local Dify (http://localhost/install)..."
try {
    $null = Invoke-WebRequest -Uri "http://localhost/install" -UseBasicParsing -TimeoutSec 5
    Write-Host "    Dify responds on localhost."
} catch {
    Write-Host "WARNING: Cannot reach http://localhost/install — start Dify first:"
    Write-Host "  .\scripts\setup-dify.ps1"
}

Write-Host ""
Write-Host "==> Starting Quick Tunnel to http://localhost:80"
Write-Host "    Copy the https://....trycloudflare.com URL into Render:"
Write-Host "      DIFY_API_BASE=https://<your-host>/v1"
Write-Host "    Keep this window open while testing Step 4 on Render."
Write-Host ""

& cloudflared tunnel --url http://localhost:80
