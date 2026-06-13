"""Elastic MCP server — exposes Elastic Cloud fuzzy search via MCP protocol over HTTP.

Deployed to Cloud Run (min-instances 0).
ADK connects to this server to call venue fuzzy-search tools.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Golazo Elastic MCP Server")


class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str | None = None
    method: str
    params: dict | None = None


TOOL_LIST = {
    "tools": [
        {
            "name": "search_venues",
            "description": "Fuzzy full-text search across WC2026 stadiums, cities, vibe tags, and fan zones.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Free-text search query"},
                    "size":  {"type": "integer", "description": "Max results", "default": 5},
                },
                "required": ["query"],
            },
        },
    ]
}


def _get_es():
    from elasticsearch import Elasticsearch
    return Elasticsearch(
        cloud_id=os.environ["ELASTIC_CLOUD_ID"],
        api_key=os.environ["ELASTIC_API_KEY"],
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "elastic-mcp"}


@app.post("/mcp")
async def mcp_endpoint(req: MCPRequest):
    if req.method == "tools/list":
        return {"jsonrpc": "2.0", "id": req.id, "result": TOOL_LIST}

    if req.method == "tools/call":
        name   = (req.params or {}).get("name")
        args   = (req.params or {}).get("arguments", {})
        result = await _dispatch(name, args)
        return {
            "jsonrpc": "2.0",
            "id": req.id,
            "result": {"content": [{"type": "text", "text": json.dumps(result)}]},
        }

    return {
        "jsonrpc": "2.0",
        "id": req.id,
        "error": {"code": -32601, "message": f"Method not found: {req.method}"},
    }


async def _dispatch(name: str, args: dict) -> dict:
    if name != "search_venues":
        return {"error": f"Unknown tool: {name}"}

    query = args.get("query", "")
    size  = int(args.get("size", 5))

    try:
        es = _get_es()
        body = {
            "query": {
                "multi_match": {
                    "query":  query,
                    "fields": ["stadium^3", "city^2", "vibe_tags^2", "fan_zones", "vibe_description"],
                    "fuzziness": "AUTO",
                }
            },
            "size": size,
        }
        resp = es.search(index="venues", body=body)
        hits = [
            {
                "stadium":    h["_source"].get("stadium"),
                "city":       h["_source"].get("city"),
                "country":    h["_source"].get("country"),
                "vibe_tags":  h["_source"].get("vibe_tags", ""),
                "fan_zones":  h["_source"].get("fan_zones", ""),
                "score":      h["_score"],
            }
            for h in resp["hits"]["hits"]
        ]
        return {"venues": hits}
    except Exception as exc:
        return {"venues": [], "error": str(exc)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8081")))
