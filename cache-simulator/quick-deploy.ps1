# Quick Kubernetes Deployment (No KIND image loading needed)

Write-Host "🚀 Quick Kubernetes Deployment..." -ForegroundColor Cyan

# Update deployment to use Docker Hub or local registry
Write-Host "`n1️⃣ Applying Kubernetes manifests..." -ForegroundColor Yellow

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

Write-Host "`n2️⃣ Checking deployment status..." -ForegroundColor Yellow
kubectl get all -n cache-simulator

Write-Host "`n✅ Done! To access the app:" -ForegroundColor Green
Write-Host "   kubectl port-forward -n cache-simulator svc/cache-simulator 8080:80" -ForegroundColor White
Write-Host "   Then open: http://localhost:8080" -ForegroundColor White
