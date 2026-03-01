# GitHub Upload Script
# Replace YOUR_USERNAME with your actual GitHub username

$GITHUB_USERNAME = Read-Host "Enter your GitHub username"
$REPO_NAME = "cache-memory-simulator"

Write-Host "🚀 Initializing Git repository..." -ForegroundColor Cyan

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Cache Memory Simulator with Docker & Kubernetes support"

# Rename branch to main
git branch -M main

# Add remote
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

Write-Host "`n✅ Ready to push!" -ForegroundColor Green
Write-Host "`nNow run:" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host "`nIf you haven't created the repo yet, go to:" -ForegroundColor Yellow
Write-Host "   https://github.com/new" -ForegroundColor White
