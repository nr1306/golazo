"""Seed matches collection from matches_seed.json. Run once after Atlas setup."""

import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent.parent / ".env")


async def main() -> None:
    import certifi
    client = AsyncIOMotorClient(os.environ["MONGODB_URI"], tlsCAFile=certifi.where())
    db = client[os.getenv("MONGODB_DB", "golazo")]

    data = json.loads((Path(__file__).parent / "matches_seed.json").read_text())
    if not data:
        print("matches_seed.json is empty")
        return

    result = await db.matches.delete_many({})
    print(f"Cleared {result.deleted_count} existing matches")

    result = await db.matches.insert_many(data)
    print(f"Inserted {len(result.inserted_ids)} matches")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
