# 🧠 Cache Memory Simulator

## Project Description

The Cache Memory Simulator is a comprehensive web-based application designed to visualize and analyze cache memory behavior in computer systems. This educational tool helps students, developers, and computer architecture enthusiasts understand how different cache configurations impact system performance through interactive simulations and real-time analytics.

Built with modern technologies, the simulator supports three cache mapping strategies: Direct Mapping, Fully Associative, and Set Associative. Users can experiment with various replacement policies including FIFO (First-In-First-Out), LRU (Least Recently Used), and LFU (Least Frequently Used) to observe their effects on cache hit rates and overall performance.

The application features a beautiful, responsive user interface with animated statistics cards, interactive charts powered by Chart.js, and a dynamic cache state visualization grid. Users can simulate memory accesses individually or in batches, viewing detailed results including hit/miss ratios, access history tables, and performance metrics in real-time.

The backend is powered by FastAPI, providing a robust RESTful API with automatic validation, comprehensive error handling, and built-in rate limiting for security. The simulation engine accurately models cache behavior with configurable parameters for cache size, block size, and associativity levels.

Deployment flexibility is a key feature - the application can run locally for development, be containerized with Docker for consistent environments, or deployed to Kubernetes clusters for production-scale operations. Complete Kubernetes manifests are included for namespace isolation, multi-replica deployments with health checks, ClusterIP services, and NGINX ingress configuration.

This project demonstrates full-stack development skills, containerization best practices, cloud-native architecture, and DevOps principles. It serves as both an educational tool for learning cache memory concepts and a showcase of modern software engineering practices including microservices architecture, API design, responsive frontend development, and container orchestration.

Perfect for computer science education, technical interviews, or anyone wanting to understand the critical role of cache memory in modern computing systems.

## Features

- ✅ Multiple mapping types: Direct, Fully Associative, Set Associative
- ✅ Replacement policies: FIFO, LRU, LFU
- ✅ Real-time charts and statistics
- ✅ Interactive cache visualization
- ✅ Access history table
- ✅ Batch simulation support
- ✅ Beautiful modern UI with animations

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up -d
```

Access at: http://localhost:8000

### Option 2: Local Development

```bash
pip install -r requirements.txt
python main.py
```

Access at: http://localhost:8000

### Option 3: Kubernetes (KIND)

1. Create KIND cluster in Docker Desktop
2. Run deployment script:

```powershell
.\deploy-k8s.ps1
```

3. Port forward to access:

```bash
kubectl port-forward -n cache-simulator svc/cache-simulator 8080:80
```

Access at: http://localhost:8080

## API Endpoints

- `POST /api/v1/configure` - Configure cache parameters
- `POST /api/v1/simulate` - Simulate single memory access
- `POST /api/v1/batch` - Batch simulation
- `GET /api/v1/stats` - Get statistics
- `POST /api/v1/reset` - Reset cache
- `GET /api/v1/health` - Health check

## Example Usage

1. Configure cache:
   - Mapping Type: Set Associative
   - Replacement Policy: LRU
   - Cache Size: 64 bytes
   - Block Size: 4 bytes
   - Associativity: 2

2. Try batch addresses: `0,4,8,12,16,20,0,4,8,12`

3. Watch the charts and cache state update in real-time!

## Architecture

```
cache-simulator/
├── main.py           # FastAPI application
├── cache.py          # Cache simulation engine
├── schemas.py        # Pydantic models
├── static/           # Frontend files
│   ├── index.html
│   ├── style.css
│   └── app.js
├── k8s/              # Kubernetes manifests
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Technologies

- **Backend**: Python 3.11, FastAPI, Uvicorn, Pydantic
- **Frontend**: Vanilla JS, Chart.js, CSS3
- **Deployment**: Docker, Kubernetes, NGINX Ingress

## License

MIT License
