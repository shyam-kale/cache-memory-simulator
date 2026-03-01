import math
from typing import Optional, List, Dict


class CacheBlock:
    def __init__(self):
        self.valid = False
        self.tag = None
        self.data = None
        self.timestamp = 0
        self.frequency = 0


class CacheSimulator:
    def __init__(self):
        self.configured = False
        self.reset_stats()

    def configure(self, mapping_type: str, replacement_policy: str, 
                  cache_size: int, block_size: int, associativity: int = 1):
        self.mapping_type = mapping_type
        self.replacement_policy = replacement_policy
        self.cache_size = cache_size
        self.block_size = block_size
        self.associativity = associativity
        
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

    def access(self, address: int) -> Dict:
        if not self.configured:
            raise ValueError("Cache not configured")
        
        self.total_accesses += 1
        self.access_counter += 1
        
        set_index, tag, block_offset = self._parse_address(address)
        cache_set = self.cache[set_index]
        
        for block in cache_set:
            if block.valid and block.tag == tag:
                self.hits += 1
                block.timestamp = self.access_counter
                block.frequency += 1
                return {
                    "address": address,
                    "hit": True,
                    "set_index": set_index if self.num_sets > 1 else None,
                    "tag": tag,
                    "block_offset": block_offset
                }
        
        self.misses += 1
        self._handle_miss(cache_set, tag)
        
        return {
            "address": address,
            "hit": False,
            "set_index": set_index if self.num_sets > 1 else None,
            "tag": tag,
            "block_offset": block_offset
        }

    def _handle_miss(self, cache_set: List[CacheBlock], tag: int):
        for block in cache_set:
            if not block.valid:
                block.valid = True
                block.tag = tag
                block.timestamp = self.access_counter
                block.frequency = 1
                return
        
        victim_idx = self._select_victim(cache_set)
        cache_set[victim_idx].tag = tag
        cache_set[victim_idx].timestamp = self.access_counter
        cache_set[victim_idx].frequency = 1

    def _select_victim(self, cache_set: List[CacheBlock]) -> int:
        if self.replacement_policy == "fifo":
            return min(range(len(cache_set)), key=lambda i: cache_set[i].timestamp)
        elif self.replacement_policy == "lru":
            return min(range(len(cache_set)), key=lambda i: cache_set[i].timestamp)
        elif self.replacement_policy == "lfu":
            return min(range(len(cache_set)), key=lambda i: cache_set[i].frequency)
        return 0

    def get_stats(self) -> Dict:
        hit_ratio = self.hits / self.total_accesses if self.total_accesses > 0 else 0.0
        
        cache_state = []
        for set_idx, cache_set in enumerate(self.cache):
            for way_idx, block in enumerate(cache_set):
                if block.valid:
                    cache_state.append({
                        "set": set_idx,
                        "way": way_idx,
                        "tag": block.tag,
                        "valid": block.valid
                    })
        
        return {
            "total_accesses": self.total_accesses,
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio": round(hit_ratio, 4),
            "cache_state": cache_state
        }

    def reset(self):
        if self.configured:
            self.cache = [[CacheBlock() for _ in range(self.associativity)] 
                          for _ in range(self.num_sets)]
        self.reset_stats()
        self.access_counter = 0
