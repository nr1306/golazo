"""MongoDB MCP server — exposes MongoDB tools via the MCP protocol over HTTP/SSE.

Deployed to Cloud Run (min-instances 0).
ADK connects to this server's /sse endpoint to call MongoDB tools.
"""

import json
import os
import sys

# Add parent dir so imports resolve when running as standalone service
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from db import get_db

app = FastAPI(title="Golazo MongoDB MCP Server")


# ---------- MCP protocol types ----------
class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str | None = None
    method: str
    params: dict | None = None


TOOL_LIST = {
    "tools": [
        {
            "name": "get_matches_by_team",
            "description": "Get all WC2026 matches for a team.",
            "inputSchema": {
                "type": "object",
                "properties": {"team": {"type": "string"}},
                "required": ["team"],
            },
        },
        {
            "name": "get_matches_by_city",
            "description": "Get all WC2026 matches in a city.",
            "inputSchema": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        },
        {
            "name": "get_crowd_insights",
            "description": "Get anonymised crowd intelligence for a host city.",
            "inputSchema": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"],
            },
        },
    ]
}


# ---------- endpoints ----------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "mongodb-mcp"}


@app.post("/mcp")
async def mcp_endpoint(req: MCPRequest):
    """JSON-RPC 2.0 endpoint for MCP tool calls."""
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
    db = get_db()
    if name == "get_matches_by_team":
        team = args.get("team", "")
        matches = await db.matches.find(
            {"$or": [
                {"team_a": {"$regex": team, "$options": "i"}},
                {"team_b": {"$regex": team, "$options": "i"}},
            ]},
            {"_id": 0},
        ).sort("date", 1).to_list(50)
        return {"matches": matches}

    if name == "get_matches_by_city":
        city = args.get("city", "")
        matches = await db.matches.find(
            {"city": {"$regex": city, "$options": "i"}}, {"_id": 0}
        ).sort("date", 1).to_list(50)
        return {"matches": matches}

    if name == "get_crowd_insights":
        city = args.get("city", "")
        pipeline = [
            {"$match": {"legs.city": {"$regex": city, "$options": "i"}}},
            {"$unwind": "$legs"},
            {"$match": {"legs.city": {"$regex": city, "$options": "i"}}},
            {"$group": {
                "_id": "$legs.city",
                "fans_booked": {"$sum": 1},
                "avg_hotel_price": {"$avg": "$legs.hotel.price_per_night"},
            }},
        ]
        results = await db.trips.aggregate(pipeline).to_list(1)
        if not results:
            return {"fans_booked": 0, "avg_hotel_price": 0, "city": city}
        r = results[0]
        return {"fans_booked": r["fans_booked"], "avg_hotel_price": int(r.get("avg_hotel_price") or 0), "city": city}

    return {"error": f"Unknown tool: {name}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
