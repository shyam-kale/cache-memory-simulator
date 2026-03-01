from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum


class MappingType(str, Enum):
    DIRECT = "direct"
    FULLY_ASSOCIATIVE = "fully_associative"
    SET_ASSOCIATIVE = "set_associative"


class ReplacementPolicy(str, Enum):
    FIFO = "fifo"
    LRU = "lru"
    LFU = "lfu"


class ConfigRequest(BaseModel):
    mapping_type: MappingType
    replacement_policy: ReplacementPolicy
    cache_size: int = Field(ge=1, le=1024)
    block_size: int = Field(ge=1, le=64)
    associativity: Optional[int] = Field(default=1, ge=1, le=16)

    @field_validator('associativity')
    @classmethod
    def validate_associativity(cls, v, info):
        if info.data.get('mapping_type') == MappingType.SET_ASSOCIATIVE:
            if v is None or v < 2:
                raise ValueError("Set associative requires associativity >= 2")
        return v


class SimulateRequest(BaseModel):
    address: int = Field(ge=0)


class BatchRequest(BaseModel):
    addresses: List[int] = Field(min_items=1, max_items=1000)


class SimulateResponse(BaseModel):
    address: int
    hit: bool
    set_index: Optional[int]
    tag: int
    block_offset: int


class StatsResponse(BaseModel):
    total_accesses: int
    hits: int
    misses: int
    hit_ratio: float
    cache_state: List[dict]


class HealthResponse(BaseModel):
    status: str
    version: str
