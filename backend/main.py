import asyncio
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from agent.agent import APP_NAME, runner, session_service
from agent.tools.crowd import get_crowd_insights
from agent.tools.match_options import generate_match_options
from agent.tools.players import get_fantasy_roster, search_players
from db import get_db
from scores import sync_scores_from_espn

app = FastAPI(title="Golazo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

async def _score_sync_loop() -> None:
    """Background task: sync WC2026 scores from ESPN every 30 minutes."""
    while True:
        await asyncio.sleep(30 * 60)
        try:
            result = await sync_scores_from_espn()
            if result["updated"]:
                print(f"[score-sync] {result['updated']} matches updated: {result['matches']}")
        except Exception as exc:
            print(f"[score-sync] error (non-fatal): {exc}")


@app.on_event("startup")
async def startup_sync_scores():
    """Sync scores immediately on startup, then keep refreshing every 30 min."""
    try:
        result = await sync_scores_from_espn()
        print(f"[startup] Score sync: {result['updated']} updated, {result['checked']} completed matches checked")
    except Exception as exc:
        print(f"[startup] Score sync failed (non-fatal): {exc}")
    asyncio.create_task(_score_sync_loop())


# ---------- session tracking ----------
_created_sessions: set[str] = set()


async def _ensure_session(session_id: str) -> None:
    if session_id not in _created_sessions:
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=session_id,
            session_id=session_id,
        )
        _created_sessions.add(session_id)


# ---------- helpers ----------
def _sse(event_type: str, payload: dict) -> str:
    payload["type"] = event_type
    return f"data: {json.dumps(payload, default=str)}\n\n"


# ---------- request/response models ----------
class ChatRequest(BaseModel):
    session_id: str
    fan_id: str | None = None
    message: str
    attachments: list | None = None


class MatchInterestRequest(BaseModel):
    match_id: str
    fan_id: str | None = None
    checkin: str
    checkout: str


class ProposeActionRequest(BaseModel):
    fan_id: str
    action_type: str
    summary: str
    payload: dict


# ---------- card emission rules ----------
_CARD_TOOLS: dict[str, str] = {
    "get_match_day_briefing": "match",
    "get_matches_by_team": "matches",
    "get_matches_by_city": "matches",
    "find_matches_near_me": "matches",
    "get_trip_itinerary": "trip",
    "save_trip_itinerary": "trip",
    "get_crowd_insights": "crowd",
    "get_fantasy_roster": "fantasy",
    "suggest_lineup": "lineup",
    "search_players": "players",
}


# ---------- endpoints ----------
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(req: ChatRequest):
    async def generate():
        try:
            await _ensure_session(req.session_id)

            fan_id_str = req.fan_id or "none"
            full_message = (
                f"[fan_id={fan_id_str}, session_id={req.session_id}]\n{req.message}"
            )

            parts: list[types.Part] = [types.Part(text=full_message)]
            if req.attachments:
                for att in req.attachments:
                    if att.get("type") == "image" and att.get("base64"):
                        parts.append(
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type="image/jpeg",
                                    data=att["base64"],
                                )
                            )
                        )

            content = types.Content(role="user", parts=parts)
            current_fan_id = req.fan_id

            async for event in runner.run_async(
                user_id=req.session_id,
                session_id=req.session_id,
                new_message=content,
            ):
                # Streaming text tokens
                if (
                    event.partial
                    and event.content
                    and event.content.parts
                ):
                    for part in event.content.parts:
                        if getattr(part, "text", None):
                            yield _sse("token", {"content": part.text})

                # Tool calls (agent invoking a tool)
                for call in event.get_function_calls():
                    yield _sse("tool_call", {"tool": call.name, "status": "running"})

                # Tool results (tool returned data)
                for resp in event.get_function_responses():
                    resp_data = resp.response if isinstance(resp.response, dict) else {"result": resp.response}

                    # Capture fan_id on first profile creation
                    if resp.name == "create_fan_profile" and resp_data.get("fan_id"):
                        current_fan_id = resp_data["fan_id"]

                    yield _sse("tool_result", {"tool": resp.name, "data": resp_data})

                    # Emit rich card for eligible tools
                    card_type = _CARD_TOOLS.get(resp.name)
                    if card_type:
                        yield _sse("card", {"card_type": card_type, "data": resp_data})

                # Final non-streaming response text
                if event.is_final_response() and not event.partial:
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if getattr(part, "text", None):
                                yield _sse("token", {"content": part.text})

            yield _sse("done", {"fan_id": current_fan_id or ""})

        except Exception as exc:  # noqa: BLE001
            yield _sse("error", {"message": str(exc)})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/pending-actions")
async def pending_actions(fan_id: str):
    db = get_db()
    actions = await db.pending_actions.find(
        {"fan_id": fan_id, "status": "pending"},
        {"_id": 1, "action_type": 1, "summary": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(20)
    return {
        "actions": [
            {
                "id": str(a["_id"]),
                "action_type": a.get("action_type"),
                "summary": a.get("summary"),
                "created_at": a["created_at"].isoformat() if isinstance(a.get("created_at"), datetime) else str(a.get("created_at")),
            }
            for a in actions
        ]
    }


@app.post("/actions/{action_id}/approve")
async def approve_action(action_id: str):
    db = get_db()
    try:
        oid = ObjectId(action_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid action_id")

    result = await db.pending_actions.update_one(
        {"_id": oid, "status": "pending"},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Action not found or already processed")

    # Immediately apply the action
    action = await db.pending_actions.find_one({"_id": oid})
    if action and action["action_type"] in ("add_match_to_trip", "update_hotel"):
        fan_id = action["fan_id"]
        payload = action.get("payload", {})
        trip = await db.trips.find_one({"fan_id": fan_id})
        legs = list(trip.get("legs", [])) if trip else []
        legs.append(payload)
        await db.trips.update_one(
            {"fan_id": fan_id},
            {"$set": {"legs": legs, "updated_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        await db.pending_actions.update_one(
            {"_id": oid},
            {"$set": {"status": "applied", "applied_at": datetime.now(timezone.utc)}},
        )

    return {"applied": True, "summary": action.get("summary") if action else ""}


@app.post("/actions/{action_id}/reject")
async def reject_action(action_id: str):
    db = get_db()
    try:
        oid = ObjectId(action_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid action_id")

    result = await db.pending_actions.update_one(
        {"_id": oid, "status": "pending"},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Action not found or already processed")
    return {"rejected": True}


@app.get("/trip")
async def get_trip(fan_id: str):
    db = get_db()
    trip = await db.trips.find_one({"fan_id": fan_id}, {"_id": 0, "vibe_embedding": 0})
    if not trip:
        return {"trip": None}
    total = sum(
        leg.get("hotel", {}).get("price_per_night", 0) * 2
        for leg in trip.get("legs", [])
    )
    return {"trip": {**trip, "total_estimated_cost": total}}


@app.get("/matches")
async def list_matches(
    team: str | None = None,
    city: str | None = None,
    stage: str | None = None,
    limit: int = 30,
):
    db = get_db()
    query: dict = {}
    if team:
        query["$or"] = [
            {"team_a": {"$regex": team, "$options": "i"}},
            {"team_b": {"$regex": team, "$options": "i"}},
        ]
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if stage:
        query["stage"] = {"$regex": stage, "$options": "i"}

    raw = await db.matches.find(
        query,
        {"_id": 1, "match_number": 1, "stage": 1, "team_a": 1, "team_b": 1,
         "date": 1, "kickoff_local": 1, "city": 1, "stadium": 1, "status": 1,
         "atmosphere": 1, "score_a": 1, "score_b": 1, "winner": 1},
    ).sort("date", 1).limit(limit).to_list(limit)

    def _fmt(m: dict) -> dict:
        date_val = m.get("date")
        return {
            "id": str(m["_id"]),
            "match_number": m.get("match_number"),
            "stage": m.get("stage"),
            "team_a": m.get("team_a"),
            "team_b": m.get("team_b"),
            "date": date_val.isoformat() if hasattr(date_val, "isoformat") else str(date_val or ""),
            "kickoff_local": m.get("kickoff_local"),
            "city": m.get("city"),
            "stadium": m.get("stadium"),
            "status": m.get("status", "scheduled"),
            "atmosphere_score": (m.get("atmosphere") or {}).get("score", 0),
            "score_a": m.get("score_a"),
            "score_b": m.get("score_b"),
            "winner": m.get("winner"),
        }

    return {"matches": [_fmt(m) for m in raw]}


@app.get("/crowd")
async def crowd_data(city: str = "Dallas"):
    return await get_crowd_insights(city)


@app.get("/atmosphere")
async def atmosphere_rankings(limit: int = 8):
    db = get_db()
    raw = await db.matches.find(
        {},
        {"_id": 1, "stage": 1, "team_a": 1, "team_b": 1,
         "date": 1, "city": 1, "atmosphere": 1, "status": 1},
    ).sort("atmosphere.score", -1).limit(limit).to_list(limit)

    def _fmt(i: int, m: dict) -> dict:
        date_val = m.get("date")
        return {
            "id": str(m["_id"]),
            "rank": i + 1,
            "team_a": m.get("team_a"),
            "team_b": m.get("team_b"),
            "stage": m.get("stage"),
            "city": m.get("city"),
            "date": date_val.isoformat() if hasattr(date_val, "isoformat") else str(date_val or ""),
            "atmosphere_score": (m.get("atmosphere") or {}).get("score", 0),
            "status": m.get("status", "scheduled"),
        }

    return {"rankings": [_fmt(i, m) for i, m in enumerate(raw)]}


@app.get("/history")
async def action_history(fan_id: str):
    db = get_db()
    raw = await db.pending_actions.find(
        {"fan_id": fan_id, "status": {"$in": ["approved", "rejected", "applied"]}},
        {"_id": 1, "action_type": 1, "summary": 1, "status": 1, "created_at": 1},
    ).sort("created_at", -1).limit(20).to_list(20)

    return {
        "history": [
            {
                "id": str(a["_id"]),
                "action_type": a.get("action_type"),
                "summary": a.get("summary"),
                "status": a.get("status"),
                "created_at": a["created_at"].isoformat() if isinstance(a.get("created_at"), datetime) else str(a.get("created_at")),
            }
            for a in raw
        ]
    }


@app.get("/players")
async def list_players(
    query: str = "",
    team: str = "",
    position: str = "",
    limit: int = 50,
):
    return await search_players(query=query, team=team, position=position, limit=limit)


@app.get("/fantasy/{fan_id}")
async def get_fantasy(fan_id: str):
    return await get_fantasy_roster(fan_id)


def _derive_stats(position: str, form: int) -> dict:
    def clamp(v: int) -> int:
        return max(40, min(99, v))

    if position == "GK":
        return {
            "DIV": clamp(form + 2), "HAN": clamp(form - 3),
            "KIC": clamp(form - 12), "REF": clamp(form + 1),
            "SPE": clamp(form - 25), "POS": clamp(form + 3),
        }
    elif position == "FWD":
        return {
            "PAC": clamp(form + 2), "SHO": clamp(form + 4),
            "PAS": clamp(form - 8), "DRI": clamp(form + 3),
            "DEF": clamp(form - 35), "PHY": clamp(form - 5),
        }
    elif position == "MID":
        return {
            "PAC": clamp(form - 5), "SHO": clamp(form - 8),
            "PAS": clamp(form + 4), "DRI": clamp(form - 2),
            "DEF": clamp(form - 10), "PHY": clamp(form - 8),
        }
    else:  # DEF
        return {
            "PAC": clamp(form - 8), "SHO": clamp(form - 25),
            "PAS": clamp(form - 10), "DRI": clamp(form - 12),
            "DEF": clamp(form + 5), "PHY": clamp(form + 3),
        }


# Formation positions (4-3-3): (x%, y%) from top-left of pitch
_FORMATION_POSITIONS = {
    "GK":  [(50, 87)],
    "DEF": [(11, 70), (33, 68), (67, 68), (89, 70)],
    "MID": [(17, 46), (50, 43), (83, 46)],
    "FWD": [(15, 19), (50, 15), (85, 19)],
}

_POS_MAP = {
    "Goalkeeper": "GK", "Defender": "DEF",
    "Midfielder": "MID", "Forward": "FWD",
}


def _player_to_dict(player: dict, pos_label: str, x: int, y: int) -> dict:
    form = player.get("form", 75)
    return {
        "id":           player.get("player_id", ""),
        "name":         player.get("name", ""),
        "position":     pos_label,
        "shirt_number": player.get("shirt_number"),
        "age":          player.get("age"),
        "nationality":  player.get("nationality", ""),
        "club":         player.get("club", ""),
        "form":         form,
        "rating":       min(99, form),
        "stats":        _derive_stats(pos_label, form),
        "x":            x,
        "y":            y,
    }


def _build_team_lineup(players: list, team_name: str) -> dict:
    gks  = sorted([p for p in players if p.get("position") == "Goalkeeper"], key=lambda x: -x.get("form", 0))
    defs = sorted([p for p in players if p.get("position") == "Defender"],   key=lambda x: -x.get("form", 0))
    mids = sorted([p for p in players if p.get("position") == "Midfielder"], key=lambda x: -x.get("form", 0))
    fwds = sorted([p for p in players if p.get("position") == "Forward"],    key=lambda x: -x.get("form", 0))

    starting_slots = (
        [("GK",  p) for p in gks[:1]]  +
        [("DEF", p) for p in defs[:4]] +
        [("MID", p) for p in mids[:3]] +
        [("FWD", p) for p in fwds[:3]]
    )

    starting_ids = {p.get("player_id") for _, p in starting_slots}
    bench_raw = sorted(
        [p for p in players if p.get("player_id") not in starting_ids],
        key=lambda x: -x.get("form", 0),
    )

    counters = {"GK": 0, "DEF": 0, "MID": 0, "FWD": 0}
    starters = []
    for pos_label, player in starting_slots:
        idx = counters[pos_label]
        counters[pos_label] += 1
        coords = _FORMATION_POSITIONS[pos_label]
        x, y = coords[idx] if idx < len(coords) else (50, 50)
        starters.append(_player_to_dict(player, pos_label, x, y))

    bench = []
    for player in bench_raw[:7]:
        raw_pos = player.get("position", "Midfielder")
        pos_label = _POS_MAP.get(raw_pos, "MID")
        bench.append(_player_to_dict(player, pos_label, 0, 0))

    return {
        "team":      team_name,
        "formation": "4-3-3",
        "players":   starters,
        "bench":     bench,
    }


@app.get("/lineup/{match_id}")
async def get_lineup(match_id: str):
    db = get_db()
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match_id")

    match = await db.matches.find_one({"_id": oid})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    team_a = match.get("team_a", "")
    team_b = match.get("team_b", "")

    team_a_players, team_b_players = await asyncio.gather(
        db.players.find({"team": team_a}).to_list(20),
        db.players.find({"team": team_b}).to_list(20),
    )

    return {
        "match_id":  match_id,
        "team_a":    _build_team_lineup(team_a_players, team_a),
        "team_b":    _build_team_lineup(team_b_players, team_b),
    }


@app.get("/match-detail/{match_id}")
async def match_detail(match_id: str):
    db = get_db()
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match_id")

    match = await db.matches.find_one({"_id": oid})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    date_val = match.get("date")
    match_data = {
        "id": str(match["_id"]),
        "match_number": match.get("match_number"),
        "stage": match.get("stage"),
        "team_a": match.get("team_a"),
        "team_b": match.get("team_b"),
        "date": date_val.isoformat() if hasattr(date_val, "isoformat") else str(date_val or ""),
        "kickoff_local": match.get("kickoff_local"),
        "city": match.get("city"),
        "stadium": match.get("stadium"),
        "status": match.get("status", "scheduled"),
        "atmosphere_score": (match.get("atmosphere") or {}).get("score", match.get("atmosphere_score", 0)),
        "score_a": match.get("score_a"),
        "score_b": match.get("score_b"),
        "winner": match.get("winner"),
    }

    venue = await db.venues.find_one(
        {"city": {"$regex": match.get("city", ""), "$options": "i"}},
        {"_id": 0, "vibe_embedding": 0},
    )
    v = venue or {}

    return {
        "match": match_data,
        "fan_zones": v.get("fan_zones", []),
        "transport_tips": v.get("transport_tips", "Check local transit on match day."),
        "vibe_description": v.get("vibe_description", ""),
        "vibe_tags": v.get("vibe_tags", []),
    }


async def _build_match_suggestions(match_id_str: str, fan_id_key: str, checkin: str, checkout: str) -> None:
    db = get_db()
    try:
        match = await db.matches.find_one({"_id": ObjectId(match_id_str)})
        if not match:
            await db.match_suggestions.update_one(
                {"match_id": match_id_str, "fan_id": fan_id_key},
                {"$set": {"status": "error", "error": "Match not found"}},
            )
            return

        city = match.get("city", "")
        stadium = match.get("stadium", "")
        date_val = match.get("date", "")
        match_date = date_val.isoformat()[:10] if hasattr(date_val, "isoformat") else str(date_val or "")[:10]
        venue = await db.venues.find_one(
            {"city": {"$regex": city, "$options": "i"}},
            {"fan_zones": 1, "_id": 0},
        )
        fan_zones = (venue or {}).get("fan_zones", [])

        result = await generate_match_options(
            match_id_str=match_id_str,
            city=city,
            stadium=stadium,
            checkin=checkin,
            checkout=checkout,
            fan_zones=fan_zones,
            match_date=match_date,
        )

        await db.match_suggestions.update_one(
            {"match_id": match_id_str, "fan_id": fan_id_key},
            {"$set": {
                "status": "ready",
                "hotels": result["hotels"],
                "city_guide": result["city_guide"],
                "updated_at": datetime.now(timezone.utc),
            }},
        )
    except Exception as exc:
        await db.match_suggestions.update_one(
            {"match_id": match_id_str, "fan_id": fan_id_key},
            {"$set": {"status": "error", "error": str(exc)}},
        )


@app.post("/match-interest")
async def match_interest(req: MatchInterestRequest, background_tasks: BackgroundTasks):
    db = get_db()
    fan_id_key = req.fan_id or "anon"

    existing = await db.match_suggestions.find_one(
        {"match_id": req.match_id, "fan_id": fan_id_key, "status": "ready"}
    )
    if existing:
        return {"status": "ready", "cached": True}

    await db.match_suggestions.update_one(
        {"match_id": req.match_id, "fan_id": fan_id_key},
        {"$set": {
            "match_id": req.match_id,
            "fan_id": fan_id_key,
            "status": "loading",
            "hotels": [],
            "city_guide": None,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )

    background_tasks.add_task(
        _build_match_suggestions,
        req.match_id,
        fan_id_key,
        req.checkin,
        req.checkout,
    )
    return {"status": "loading"}


@app.get("/match-suggestions")
async def match_suggestions(match_id: str, fan_id: str | None = None):
    db = get_db()
    fan_id_key = fan_id or "anon"
    doc = await db.match_suggestions.find_one(
        {"match_id": match_id, "fan_id": fan_id_key},
        {"_id": 0},
    )
    if not doc:
        return {"status": "not_found", "hotels": [], "city_guide": None}
    return {
        "status": doc.get("status", "loading"),
        "hotels": doc.get("hotels", []),
        "city_guide": doc.get("city_guide"),
    }


@app.post("/propose-action")
async def propose_action_endpoint(req: ProposeActionRequest):
    db = get_db()
    doc = {
        "fan_id": req.fan_id,
        "action_type": req.action_type,
        "summary": req.summary,
        "payload": req.payload,
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.pending_actions.insert_one(doc)
    return {"action_id": str(result.inserted_id), "status": "pending"}


@app.post("/webhook/match-finished")
async def match_finished(request: Request):
    """Called by Atlas Database Trigger when a match status → finished."""
    secret = os.getenv("ATLAS_WEBHOOK_SECRET", "")
    if secret:
        sig_header = request.headers.get("X-Hub-Signature-256", "")
        body = await request.body()
        expected = "sha256=" + hmac.new(
            secret.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            # Return 200 to stop Atlas from retrying on auth failures
            return {"status": "ignored", "reason": "invalid signature"}
    else:
        body = await request.body()

    try:
        payload = json.loads(body)
    except Exception:
        return {"status": "error", "reason": "invalid JSON"}

    full_doc = payload.get("fullDocument", {})
    match_id = full_doc.get("match_id")
    winner = full_doc.get("winner")
    if not match_id or not winner:
        return {"status": "ok", "processed": False}

    db = get_db()
    # Find all fans with this team in their trip
    affected_trips = await db.trips.find(
        {"legs.team_a": winner},
        {"fan_id": 1, "legs": 1},
    ).to_list(200)
    affected_trips += await db.trips.find(
        {"legs.team_b": winner},
        {"fan_id": 1, "legs": 1},
    ).to_list(200)

    pending_count = 0
    seen_fans: set[str] = set()
    for trip in affected_trips:
        fan_id = trip.get("fan_id")
        if not fan_id or fan_id in seen_fans:
            continue
        seen_fans.add(fan_id)
        summary = (
            f"{winner} advanced! We found a hotel near the next venue — review and approve to add it to your trip."
        )
        await db.pending_actions.insert_one({
            "fan_id": fan_id,
            "action_type": "add_match_to_trip",
            "summary": summary,
            "payload": {"team": winner, "match_id": match_id, "source": "proactive"},
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        })
        pending_count += 1

    return {"status": "ok", "processed": True, "pending_actions_created": pending_count}


@app.post("/admin/sync-scores")
async def admin_sync_scores():
    """Pull real WC2026 results from ESPN public API and update MongoDB scores."""
    result = await sync_scores_from_espn()
    return result
