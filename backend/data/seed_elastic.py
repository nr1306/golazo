"""Push venue documents to Elastic Cloud for fuzzy text search.

Indexes venue name, city, vibe_tags, and fan_zones into an 'venues' index.
Run after seed_venues.py.
"""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from elasticsearch import Elasticsearch

load_dotenv(Path(__file__).parent.parent / ".env")

INDEX = "venues"
MAPPING = {
    "mappings": {
        "properties": {
            "venue_id":   {"type": "keyword"},
            "stadium":    {"type": "text", "analyzer": "standard"},
            "city":       {"type": "text", "analyzer": "standard"},
            "country":    {"type": "keyword"},
            "capacity":   {"type": "integer"},
            "vibe_tags":  {"type": "text", "analyzer": "standard"},
            "fan_zones":  {"type": "text", "analyzer": "standard"},
            "vibe_description": {"type": "text", "analyzer": "standard"},
            "transport_tips":   {"type": "text"},
        }
    }
}


def seed() -> None:
    cloud_id = os.environ.get("ELASTIC_CLOUD_ID")
    api_key  = os.environ.get("ELASTIC_API_KEY")
    if not cloud_id or not api_key:
        print("ELASTIC_CLOUD_ID / ELASTIC_API_KEY not set — skipping Elastic seed")
        return

    es = Elasticsearch(cloud_id=cloud_id, api_key=api_key)

    # Create or recreate index
    if es.indices.exists(index=INDEX):
        es.indices.delete(index=INDEX)
        print(f"Deleted existing '{INDEX}' index")

    es.indices.create(index=INDEX, body=MAPPING)
    print(f"Created '{INDEX}' index")

    venues = json.loads((Path(__file__).parent / "venues_seed.json").read_text())
    for v in venues:
        # Strip the vibe_embedding — Elastic doesn't need it
        doc = {k: val for k, val in v.items() if k != "vibe_embedding"}
        # Flatten vibe_tags list to space-joined string for better search
        if isinstance(doc.get("vibe_tags"), list):
            doc["vibe_tags"] = " ".join(doc["vibe_tags"])
        if isinstance(doc.get("fan_zones"), list):
            doc["fan_zones"] = " ".join(doc["fan_zones"])
        es.index(index=INDEX, id=v["venue_id"], document=doc)

    es.indices.refresh(index=INDEX)
    print(f"Indexed {len(venues)} venues into Elastic '{INDEX}'")


if __name__ == "__main__":
    seed()
