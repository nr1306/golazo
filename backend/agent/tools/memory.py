import os
from datetime import datetime, timezone

from db import get_db


async def _embed(text: str) -> list[float] | None:
    """Embed text via OpenAI text-embedding-3-small (768-dim). Returns None on failure."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
            dimensions=768,
        )
        return response.data[0].embedding
    except Exception:
        return None


async def recall_memory(fan_id: str, query: str, top_k: int = 5) -> dict:
    """Retrieve the most relevant memories for a fan.

    Args:
        fan_id: The fan's MongoDB ObjectId string.
        query: The user's current message or topic to search against.
        top_k: Number of memories to return (default 5).

    Returns:
        {"memories": [{"content": str, "type": str, "created_at": str}]}
    """
    if not fan_id or fan_id == "none":
        return {"memories": []}

    db = get_db()
    embedding = await _embed(query)

    if embedding:
        try:
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "memory_recall_vector",
                        "path": "embedding",
                        "queryVector": embedding,
                        "numCandidates": top_k * 10,
                        "limit": top_k,
                        "filter": {"fan_id": fan_id},
                    }
                },
                {"$project": {"content": 1, "type": 1, "created_at": 1, "_id": 0}},
            ]
            results = await db.agent_memory.aggregate(pipeline).to_list(top_k)
            if results:
                for r in results:
                    if isinstance(r.get("created_at"), datetime):
                        r["created_at"] = r["created_at"].isoformat()
                return {"memories": results}
        except Exception:
            pass

    # Fallback: return most recent memories for this fan
    results = await db.agent_memory.find(
        {"fan_id": fan_id},
        {"content": 1, "type": 1, "created_at": 1, "_id": 0},
    ).sort("created_at", -1).limit(top_k).to_list(top_k)
    for r in results:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
    return {"memories": results}


async def remember(fan_id: str, content: str, memory_type: str = "preference") -> dict:
    """Store a durable memory about a fan.

    Args:
        fan_id: The fan's MongoDB ObjectId string.
        content: The fact or preference to remember (e.g. "Supports Mexico, budget $3000").
        memory_type: Category tag — one of: preference, trip, team, dietary, general.

    Returns:
        {"stored": True, "id": str}
    """
    if not fan_id or fan_id == "none":
        return {"stored": False, "reason": "no fan_id"}

    embedding = await _embed(content)
    db = get_db()
    doc = {
        "fan_id": fan_id,
        "content": content,
        "type": memory_type,
        "created_at": datetime.now(timezone.utc),
    }
    if embedding:
        doc["embedding"] = embedding

    result = await db.agent_memory.insert_one(doc)
    return {"stored": True, "id": str(result.inserted_id)}
