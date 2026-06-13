"""Create all 8 MongoDB index groups for Golazo.

Atlas Vector Search indexes (groups 1–3) must be created via the Atlas UI
or the Atlas Admin API — pymongo cannot create them.
This script creates the standard compound indexes (groups 4–8).

Run once after seeding.
"""

import asyncio
import os
from pathlib import Path

import pymongo
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent.parent / ".env")

ATLAS_VECTOR_INSTRUCTIONS = """
MANUAL STEP — create these in Atlas UI → Search → Create Index:

1. venues_vibe_vector (Atlas Vector Search)
   Collection: venues   Field: vibe_embedding   Dimensions: 768   Similarity: cosine

2. memory_recall_vector (Atlas Vector Search, with filter)
   Collection: agent_memory   Field: embedding   Dimensions: 768   Similarity: cosine
   Filter field: fan_id

3. venues_text_search (Atlas Search — fuzzy text)
   Collection: venues
   Mappings: { stadium: string, city: string, vibe_tags: string, fan_zones: string }

Index JSON for #1 (paste in Atlas):
{
  "fields": [{"type": "vector", "path": "vibe_embedding", "numDimensions": 768, "similarity": "cosine"}]
}

Index JSON for #2 (paste in Atlas):
{
  "fields": [
    {"type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine"},
    {"type": "filter", "path": "fan_id"}
  ]
}
"""


async def main() -> None:
    print(ATLAS_VECTOR_INSTRUCTIONS)
    print("-" * 60)
    print("Creating standard compound indexes via Motor...")

    client = AsyncIOMotorClient(os.environ["MONGODB_URI"])
    db = client[os.getenv("MONGODB_DB", "golazo")]

    # Group 4 — matches compound indexes
    await db.matches.create_index([("team_a", 1), ("date", 1)])
    await db.matches.create_index([("team_b", 1), ("date", 1)])
    await db.matches.create_index([("status", 1)])
    await db.matches.create_index([("city", 1), ("date", 1)])
    print("OK: matches indexes")

    # Group 5 — venues 2dsphere (geospatial)
    await db.venues.create_index([("location", pymongo.GEOSPHERE)])
    print("OK: venues 2dsphere index")

    # Group 6 — players compound indexes
    await db.players.create_index([("name", 1)], unique=True)
    await db.players.create_index([("team", 1), ("position", 1)])
    await db.players.create_index([("available", 1), ("form", -1)])
    print("OK: players indexes")

    # Group 7 — pending_actions compound indexes
    await db.pending_actions.create_index([("fan_id", 1), ("status", 1)])
    print("OK: pending_actions indexes")

    # Group 8 — agent_memory compound indexes
    await db.agent_memory.create_index([("fan_id", 1), ("type", 1), ("created_at", -1)])
    print("OK: agent_memory indexes")

    # fans index
    await db.fans.create_index([("session_id", 1)], unique=True)
    print("OK: fans.session_id unique index")

    # trips index
    await db.trips.create_index([("fan_id", 1)], unique=True)
    print("OK: trips.fan_id unique index")

    print("\nAll standard indexes created.")
    print("Remember to create the 3 Atlas Vector/Search indexes manually (see above).")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
