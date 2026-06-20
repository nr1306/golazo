import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None


def get_db() -> AsyncIOMotorDatabase:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            os.environ["MONGODB_URI"],
            tlsCAFile=certifi.where(),
        )
    return _client[os.getenv("MONGODB_DB", "golazo")]
