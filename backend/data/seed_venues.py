"""Seed venues collection from venues_seed.json.

Vibe embeddings are skipped if GCP credentials are not available.
Run generate_embeddings() separately once service-account.json is in place.
"""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent.parent / ".env")


def _embed_batch(texts: list[str]) -> list[list[float]] | None:
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "./service-account.json")
    if not Path(creds_path).exists():
        print("  service-account.json not found — skipping vibe embeddings (add later)")
        return None
    try:
        import vertexai
        from vertexai.language_models import TextEmbeddingModel
        vertexai.init(
            project=os.environ.get("GOOGLE_CLOUD_PROJECT", "golazo-wc2026"),
            location=os.environ.get("VERTEX_AI_LOCATION", "us-central1"),
        )
        model = TextEmbeddingModel.from_pretrained("text-embedding-004")
        results = model.get_embeddings(texts)
        return [r.values for r in results]
    except Exception as e:
        print(f"  Embedding generation failed: {e} — skipping")
        return None


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGODB_URI"])
    db = client[os.getenv("MONGODB_DB", "golazo")]

    venues = json.loads((Path(__file__).parent / "venues_seed.json").read_text())
    if not venues:
        print("venues_seed.json is empty")
        return

    texts = [v.get("vibe_description", v.get("vibe_text", "")) for v in venues]
    embeddings = _embed_batch(texts)

    if embeddings:
        for venue, emb in zip(venues, embeddings):
            venue["vibe_embedding"] = emb
        print(f"Vibe embeddings generated for {len(venues)} venues")
    else:
        print("Venues will be seeded without vibe_embedding (run seed_venues.py again after GCP setup)")

    result = await db.venues.delete_many({})
    print(f"Cleared {result.deleted_count} existing venues")

    result = await db.venues.insert_many(venues)
    print(f"Inserted {len(result.inserted_ids)} venues")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
