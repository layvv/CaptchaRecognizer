import asyncio
import redis.asyncio as redis
import json
from typing import Any, Dict, List, Optional, Union, Set
import os

# 从环境变量获取Redis配置
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
REDIS_DB = int(os.environ.get("REDIS_DB", 0))
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", None)

class RedisClient:
    """Redis异步客户端封装"""
    
    def __init__(self):
        self.pool = None
        self.client = None
    
    async def connect(self):
        """连接到Redis服务器"""
        if self.pool is None:
            self.pool = redis.ConnectionPool(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                password=REDIS_PASSWORD,
                decode_responses=True  # 自动解码响应
            )
        
        if self.client is None:
            self.client = redis.Redis(connection_pool=self.pool)
    
    async def get(self, key: str) -> Optional[str]:
        """获取键值"""
        await self.connect()
        return await self.client.get(key)
    
    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """设置键值"""
        await self.connect()
        return await self.client.set(key, value, ex=ex)
    
    async def delete(self, key: str) -> int:
        """删除键"""
        await self.connect()
        return await self.client.delete(key)
    
    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        await self.connect()
        return await self.client.exists(key)
    
    async def expire(self, key: str, seconds: int) -> bool:
        """设置过期时间"""
        await self.connect()
        return await self.client.expire(key, seconds)
    
    async def incr(self, key: str) -> int:
        """递增键值"""
        await self.connect()
        return await self.client.incr(key)
    
    async def hget(self, key: str, field: str) -> Optional[str]:
        """获取哈希表字段"""
        await self.connect()
        return await self.client.hget(key, field)
    
    async def hset(self, key: str, field: str = None, value: str = None, mapping: Dict = None) -> int:
        """设置哈希表字段"""
        await self.connect()
        if mapping:
            return await self.client.hset(key, mapping=mapping)
        return await self.client.hset(key, field, value)
    
    async def hdel(self, key: str, *fields: str) -> int:
        """删除哈希表字段"""
        await self.connect()
        return await self.client.hdel(key, *fields)
    
    async def hgetall(self, key: str) -> Dict[str, str]:
        """获取哈希表所有字段"""
        await self.connect()
        return await self.client.hgetall(key)
    
    async def hincrby(self, key: str, field: str, amount: int = 1) -> int:
        """递增哈希表字段"""
        await self.connect()
        return await self.client.hincrby(key, field, amount)
    
    async def lpush(self, key: str, *values: str) -> int:
        """列表左侧添加元素"""
        await self.connect()
        return await self.client.lpush(key, *values)
    
    async def rpush(self, key: str, *values: str) -> int:
        """列表右侧添加元素"""
        await self.connect()
        return await self.client.rpush(key, *values)
    
    async def lpop(self, key: str) -> Optional[str]:
        """列表左侧弹出元素"""
        await self.connect()
        return await self.client.lpop(key)
    
    async def rpop(self, key: str) -> Optional[str]:
        """列表右侧弹出元素"""
        await self.connect()
        return await self.client.rpop(key)
    
    async def lrange(self, key: str, start: int, end: int) -> List[str]:
        """获取列表范围内的元素"""
        await self.connect()
        return await self.client.lrange(key, start, end)
    
    async def ltrim(self, key: str, start: int, end: int) -> bool:
        """修剪列表"""
        await self.connect()
        return await self.client.ltrim(key, start, end)
    
    async def sadd(self, key: str, *values: str) -> int:
        """集合添加元素"""
        await self.connect()
        return await self.client.sadd(key, *values)
    
    async def smembers(self, key: str) -> Set[str]:
        """获取集合所有成员"""
        await self.connect()
        return await self.client.smembers(key)
    
    async def srem(self, key: str, *values: str) -> int:
        """移除集合元素"""
        await self.connect()
        return await self.client.srem(key, *values)
    
    async def scan_iter(self, match: Optional[str] = None, count: int = 10):
        """扫描迭代器"""
        await self.connect()
        async for key in self.client.scan_iter(match=match, count=count):
            yield key
    
    async def close(self):
        """关闭连接"""
        if self.client:
            await self.client.close()
            self.client = None
        
        if self.pool:
            await self.pool.disconnect()
            self.pool = None

# 创建Redis客户端实例
redis_client = RedisClient() 