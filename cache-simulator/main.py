from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from collections import defaultdict
from pathlib import Path
from cache import CacheSimulator
from schemas import (
    ConfigRequest, SimulateRequest, BatchRequest,
    SimulateResponse, StatsResponse, HealthResponse
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Cache Simulator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache_sim = CacheSimulator()
rate_limiter = defaultdict(list)
RATE_LIMIT = 100
RATE_WINDOW = 60


def check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    rate_limiter[client_ip] = [t for t in rate_limiter[client_ip] if now - t < RATE_WINDOW]
    
    if len(rate_limiter[client_ip]) >= RATE_LIMIT:
        return False
    
    rate_limiter[client_ip].append(now)
    return True


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    
    if not check_rate_limit(client_ip):
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded"}
        )
    
    response = await call_next(request)
    return response


@app.post("/api/v1/configure")
async def configure_cache(config: ConfigRequest):
    try:
        cache_sim.configure(
            mapping_type=config.mapping_type.value,
            replacement_policy=config.replacement_policy.value,
            cache_size=config.cache_size,
            block_size=config.block_size,
            associativity=config.associativity
        )
        logger.info(f"Cache configured: {config.model_dump()}")
        return {"message": "Cache configured successfully", "config": config.model_dump()}
    except Exception as e:
        logger.error(f"Configuration error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/simulate", response_model=SimulateResponse)
async def simulate_access(request: SimulateRequest):
    try:
        result = cache_sim.access(request.address)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/batch")
async def batch_simulate(request: BatchRequest):
    try:
        results = []
        for address in request.addresses:
            result = cache_sim.access(address)
            results.append(result)
        return {"results": results, "count": len(results)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Batch simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_stats():
    try:
        stats = cache_sim.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/reset")
async def reset_cache():
    try:
        cache_sim.reset()
        logger.info("Cache reset")
        return {"message": "Cache reset successfully"}
    except Exception as e:
        logger.error(f"Reset error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


# Mount static files with absolute path
static_dir = Path(__file__).parent / "static"
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
