"""Seed players collection from players_seed.json. Run after updating player data."""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent.parent / ".env")


async def main() -> None:
    import certifi
    client = AsyncIOMotorClient(os.environ["MONGODB_URI"], tlsCAFile=certifi.where())
    db = client[os.getenv("MONGODB_DB", "golazo")]

    data = json.loads((Path(__file__).parent / "players_seed.json").read_text())
    if not data:
        print("players_seed.json is empty")
        return

    result = await db.players.delete_many({})
    print(f"Cleared {result.deleted_count} existing players")

    result = await db.players.insert_many(data)
    print(f"Inserted {len(result.inserted_ids)} players")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
