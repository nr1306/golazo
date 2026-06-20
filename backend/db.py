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
            # keep pool small — Atlas M0 has a very low connection cap
            maxPoolSize=5,
            minPoolSize=1,
            # fail fast rather than hang; Motor retries automatically
            serverSelectionTimeoutMS=8_000,
            connectTimeoutMS=8_000,
            socketTimeoutMS=30_000,
            # Atlas closes idle sockets ~9 min; stay under that
            maxIdleTimeMS=420_000,
            retryWrites=True,
            retryReads=True,
        )
    return _client[os.getenv("MONGODB_DB", "golazo")]
