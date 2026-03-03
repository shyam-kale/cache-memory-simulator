import math
import time
from typing import Optional, List, Dict
from collections import deque


class CacheBlock:
    def __init__(self):
        self.valid = False
        self.tag = None
        self.data = None
        self.timestamp = 0
        self.frequency = 0
        self.dirty = False  # For write-back cache
        self.last_access_time = 0


class CacheSimulator:
    def __init__(self):
        self.configured = False
        self.access_history = deque(maxlen=100)  # Last 100 accesses
        self.write_policy = "write_through"  # write_through or write_back
        self.write_misses = 0
        self.write_hits = 0
        self.evictions = 0
        self.compulsory_misses = 0
        self.conflict_misses = 0
        self.capacity_misses = 0
        self.accessed_blocks = set()  # Track unique blocks accessed
        self.performance_metrics = {
            "avg_access_time": 0,
            "memory_traffic": 0,
            "power_consumption": 0
        }
        self.reset_stats()

    def configure(self, mapping_type: str, replacement_policy: str, 
                  cache_size: int, block_size: int, associativity: int = 1,
                  write_policy: str = "write_through"):
        self.mapping_type = mapping_type
        self.replacement_policy = replacement_policy
        self.cache_size = cache_size
        self.block_size = block_size
        self.associativity = associativity
        self.write_policy = write_policy
        
        self.num_blocks = cache_size // block_size
        self.offset_bits = int(math.log2(block_size))
        
        if mapping_type == "direct":
            self.num_sets = self.num_blocks
            self.associativity = 1
        elif mapping_type == "fully_associative":
            self.num_sets = 1
            self.associativity = self.num_blocks
        else:
            self.num_sets = self.num_blocks // associativity
        
        self.index_bits = int(math.log2(self.num_sets)) if self.num_sets > 1 else 0
        self.cache = [[CacheBlock() for _ in range(self.associativity)] 
                      for _ in range(self.num_sets)]
        
        self.configured = True
        self.reset_stats()

    def reset_stats(self):
        self.total_accesses = 0
        self.hits = 0
        self.misses = 0
        self.access_counter = 0
        self.write_misses = 0
        self.write_hits = 0
        self.evictions = 0
        self.compulsory_misses = 0
        self.conflict_misses = 0
        self.capacity_misses = 0
        self.accessed_blocks = set()
        self.access_history.clear()
        self.performance_metrics = {
            "avg_access_time": 0,
            "memory_traffic": 0,
            "power_consumption": 0
        }

    def _parse_address(self, address: int) -> tuple:
        block_offset = address & ((1 << self.offset_bits) - 1)
        address >>= self.offset_bits
        
        if self.index_bits > 0:
            set_index = address & ((1 << self.index_bits) - 1)
            address >>= self.index_bits
        else:
            set_index = 0
        
        tag = address
        return set_index, tag, block_offset

    def access(self, address: int, is_write: bool = False) -> Dict:
        if not self.configured:
            raise ValueError("Cache not configured")
        
        start_time = time.time()
        self.total_accesses += 1
        self.access_counter += 1
        
        set_index, tag, block_offset = self._parse_address(address)
        cache_set = self.cache[set_index]
        
        # Check for hit
        hit_block = None
        for block in cache_set:
            if block.valid and block.tag == tag:
                hit_block = block
                break
        
        if hit_block:
            self.hits += 1
            if is_write:
                self.write_hits += 1
                if self.write_policy == "write_back":
                    hit_block.dirty = True
            
            hit_block.timestamp = self.access_counter
            hit_block.frequency += 1
            hit_block.last_access_time = time.time()
            
            access_time = 1  # Cache hit time (1 cycle)
            result = {
                "address": address,
                "hit": True,
                "is_write": is_write,
                "set_index": set_index if self.num_sets > 1 else None,
                "tag": tag,
                "block_offset": block_offset,
                "access_time": access_time,
                "eviction": False
            }
        else:
            # Cache miss
            self.misses += 1
            if is_write:
                self.write_misses += 1
            
            # Classify miss type
            block_id = f"{set_index}_{tag}"
            if block_id not in self.accessed_blocks:
                self.compulsory_misses += 1
                self.accessed_blocks.add(block_id)
            else:
                # Check if it's capacity or conflict miss
                all_valid = all(block.valid for block in cache_set)
                if all_valid:
                    self.conflict_misses += 1
                else:
                    self.capacity_misses += 1
            
            eviction_occurred = self._handle_miss(cache_set, tag, is_write)
            
            # Miss penalty: memory access time (100 cycles)
            access_time = 100
            if self.write_policy == "write_back" and eviction_occurred:
                access_time += 100  # Additional write-back time
            
            result = {
                "address": address,
                "hit": False,
                "is_write": is_write,
                "set_index": set_index if self.num_sets > 1 else None,
                "tag": tag,
                "block_offset": block_offset,
                "access_time": access_time,
                "eviction": eviction_occurred,
                "miss_type": self._get_last_miss_type()
            }
        
        # Update performance metrics
        self._update_performance_metrics(access_time, is_write)
        
        # Add to history
        self.access_history.append({
            "address": address,
            "hit": result["hit"],
            "is_write": is_write,
            "timestamp": self.access_counter
        })
        
        return result

    def _handle_miss(self, cache_set: List[CacheBlock], tag: int, is_write: bool = False) -> bool:
        # Check for empty block
        for block in cache_set:
            if not block.valid:
                block.valid = True
                block.tag = tag
                block.timestamp = self.access_counter
                block.frequency = 1
                block.last_access_time = time.time()
                if is_write and self.write_policy == "write_back":
                    block.dirty = True
                return False
        
        # Need to evict
        self.evictions += 1
        victim_idx = self._select_victim(cache_set)
        victim = cache_set[victim_idx]
        
        eviction_occurred = victim.dirty  # Write-back needed if dirty
        
        victim.tag = tag
        victim.timestamp = self.access_counter
        victim.frequency = 1
        victim.last_access_time = time.time()
        victim.dirty = is_write and self.write_policy == "write_back"
        
        return eviction_occurred

    def _select_victim(self, cache_set: List[CacheBlock]) -> int:
        if self.replacement_policy == "fifo":
            return min(range(len(cache_set)), key=lambda i: cache_set[i].timestamp)
        elif self.replacement_policy == "lru":
            return min(range(len(cache_set)), key=lambda i: cache_set[i].timestamp)
        elif self.replacement_policy == "lfu":
            return min(range(len(cache_set)), key=lambda i: cache_set[i].frequency)
        return 0
    
    def _get_last_miss_type(self) -> str:
        if self.compulsory_misses > 0 and self.total_accesses == self.compulsory_misses:
            return "compulsory"
        elif self.conflict_misses > self.capacity_misses:
            return "conflict"
        else:
            return "capacity"
    
    def _update_performance_metrics(self, access_time: int, is_write: bool):
        # Update average access time
        total_time = self.performance_metrics["avg_access_time"] * (self.total_accesses - 1)
        self.performance_metrics["avg_access_time"] = (total_time + access_time) / self.total_accesses
        
        # Update memory traffic (in bytes)
        if access_time > 1:  # Miss occurred
            self.performance_metrics["memory_traffic"] += self.block_size
        
        # Estimate power consumption (arbitrary units)
        power = 1 if access_time == 1 else 10  # Cache hit vs miss
        if is_write:
            power += 2
        self.performance_metrics["power_consumption"] += power
    
    def get_temporal_locality_score(self) -> float:
        """Calculate temporal locality based on recent accesses"""
        if len(self.access_history) < 2:
            return 0.0
        
        recent_addresses = [acc["address"] for acc in list(self.access_history)[-20:]]
        unique_addresses = len(set(recent_addresses))
        return 1.0 - (unique_addresses / len(recent_addresses))
    
    def get_spatial_locality_score(self) -> float:
        """Calculate spatial locality based on sequential accesses"""
        if len(self.access_history) < 2:
            return 0.0
        
        sequential_count = 0
        history_list = list(self.access_history)[-20:]
        
        for i in range(len(history_list) - 1):
            addr_diff = abs(history_list[i+1]["address"] - history_list[i]["address"])
            if addr_diff <= self.block_size:
                sequential_count += 1
        
        return sequential_count / (len(history_list) - 1) if len(history_list) > 1 else 0.0
    
    def get_cache_utilization(self) -> float:
        """Calculate percentage of cache blocks in use"""
        valid_blocks = sum(1 for cache_set in self.cache 
                          for block in cache_set if block.valid)
        total_blocks = self.num_blocks
        return (valid_blocks / total_blocks) * 100 if total_blocks > 0 else 0.0
    
    def predict_next_access(self) -> Optional[int]:
        """Simple prediction based on access pattern"""
        if len(self.access_history) < 3:
            return None
        
        recent = list(self.access_history)[-3:]
        addresses = [acc["address"] for acc in recent]
        
        # Check for stride pattern
        stride1 = addresses[1] - addresses[0]
        stride2 = addresses[2] - addresses[1]
        
        if stride1 == stride2:
            return addresses[2] + stride1
        
        return None

    def get_stats(self) -> Dict:
        hit_ratio = self.hits / self.total_accesses if self.total_accesses > 0 else 0.0
        miss_ratio = 1.0 - hit_ratio
        
        cache_state = []
        for set_idx, cache_set in enumerate(self.cache):
            for way_idx, block in enumerate(cache_set):
                if block.valid:
                    cache_state.append({
                        "set": set_idx,
                        "way": way_idx,
                        "tag": block.tag,
                        "valid": block.valid,
                        "dirty": block.dirty,
                        "frequency": block.frequency
                    })
        
        # Calculate AMAT (Average Memory Access Time)
        cache_hit_time = 1
        memory_access_time = 100
        amat = cache_hit_time + (miss_ratio * memory_access_time)
        
        return {
            "total_accesses": self.total_accesses,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": round(hit_ratio, 4),
            "miss_ratio": round(miss_ratio, 4),
            "write_hits": self.write_hits,
            "write_misses": self.write_misses,
            "evictions": self.evictions,
            "compulsory_misses": self.compulsory_misses,
            "conflict_misses": self.conflict_misses,
            "capacity_misses": self.capacity_misses,
            "cache_utilization": round(self.get_cache_utilization(), 2),
            "temporal_locality": round(self.get_temporal_locality_score(), 4),
            "spatial_locality": round(self.get_spatial_locality_score(), 4),
            "amat": round(amat, 2),
            "avg_access_time": round(self.performance_metrics["avg_access_time"], 2),
            "memory_traffic_bytes": self.performance_metrics["memory_traffic"],
            "power_consumption": self.performance_metrics["power_consumption"],
            "predicted_next_address": self.predict_next_access(),
            "cache_state": cache_state,
            "recent_history": list(self.access_history)[-10:]
        }

    def reset(self):
        if self.configured:
            self.cache = [[CacheBlock() for _ in range(self.associativity)] 
                          for _ in range(self.num_sets)]
        self.reset_stats()
        self.access_counter = 0
