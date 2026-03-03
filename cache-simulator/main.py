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
        is_write = getattr(request, 'is_write', False)
        result = cache_sim.access(request.address, is_write=is_write)
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
        is_write = getattr(request, 'is_write', False)
        for address in request.addresses:
            result = cache_sim.access(address, is_write=is_write)
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


@app.get("/api/v1/analytics")
async def get_analytics():
    """Get advanced analytics and insights"""
    try:
        stats = cache_sim.get_stats()
        return {
            "performance": {
                "amat": stats.get("amat"),
                "avg_access_time": stats.get("avg_access_time"),
                "cache_utilization": stats.get("cache_utilization")
            },
            "locality": {
                "temporal": stats.get("temporal_locality"),
                "spatial": stats.get("spatial_locality")
            },
            "miss_classification": {
                "compulsory": stats.get("compulsory_misses"),
                "conflict": stats.get("conflict_misses"),
                "capacity": stats.get("capacity_misses")
            },
            "resource_usage": {
                "memory_traffic_bytes": stats.get("memory_traffic_bytes"),
                "power_consumption": stats.get("power_consumption"),
                "evictions": stats.get("evictions")
            }
        }
    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/prediction")
async def get_prediction():
    """Get next address prediction based on access pattern"""
    try:
        predicted = cache_sim.predict_next_access()
        return {
            "predicted_address": predicted,
            "confidence": "high" if predicted is not None else "low",
            "recent_pattern": list(cache_sim.access_history)[-5:]
        }
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/heatmap")
async def get_heatmap():
    """Get cache access heatmap data"""
    try:
        heatmap_data = {}
        for set_idx, cache_set in enumerate(cache_sim.cache):
            for way_idx, block in enumerate(cache_set):
                if block.valid:
                    key = f"set{set_idx}_way{way_idx}"
                    heatmap_data[key] = {
                        "frequency": block.frequency,
                        "tag": block.tag,
                        "dirty": block.dirty
                    }
        return {"heatmap": heatmap_data, "num_sets": cache_sim.num_sets, "associativity": cache_sim.associativity}
    except Exception as e:
        logger.error(f"Heatmap error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/compare")
async def compare_policies(addresses: list[int]):
    """Compare different replacement policies on same access pattern"""
    try:
        results = {}
        original_policy = cache_sim.replacement_policy
        original_config = {
            "mapping_type": cache_sim.mapping_type,
            "cache_size": cache_sim.cache_size,
            "block_size": cache_sim.block_size,
            "associativity": cache_sim.associativity
        }
        
        for policy in ["fifo", "lru", "lfu"]:
            cache_sim.configure(
                mapping_type=original_config["mapping_type"],
                replacement_policy=policy,
                cache_size=original_config["cache_size"],
                block_size=original_config["block_size"],
                associativity=original_config["associativity"]
            )
            
            for addr in addresses:
                cache_sim.access(addr)
            
            stats = cache_sim.get_stats()
            results[policy] = {
                "hit_ratio": stats["hit_ratio"],
                "misses": stats["misses"],
                "amat": stats["amat"]
            }
        
        # Restore original policy
        cache_sim.configure(
            mapping_type=original_config["mapping_type"],
            replacement_policy=original_policy,
            cache_size=original_config["cache_size"],
            block_size=original_config["block_size"],
            associativity=original_config["associativity"]
        )
        
        return {"comparison": results}
    except Exception as e:
        logger.error(f"Comparison error: {str(e)}")
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
