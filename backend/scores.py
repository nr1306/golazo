"""Sync real WC2026 match scores from ESPN's public scoreboard API into MongoDB."""
from __future__ import annotations

from datetime import date, timedelta

import httpx

from db import get_db

# WC2026 group stage begins June 11 2026
WC2026_START = date(2026, 6, 11)

# ESPN display names that differ from our seed names
_ESPN_TEAM_MAP: dict[str, str] = {
    "United States": "USA",
    "Korea Republic": "South Korea",
    "Czech Republic": "Czechia",
    "Czechia": "Czechia",
    "IR Iran": "Iran",
    "Türkiye": "Turkey",
    "Ivory Coast": "Côte d'Ivoire",
    "Cote d'Ivoire": "Côte d'Ivoire",
    "DRC": "DR Congo",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Bosnia & Herzegovina": "Bosnia and Herzegovina",
    "Trinidad & Tobago": "Trinidad and Tobago",
    "Congo, DR": "DR Congo",
}


def _norm(name: str) -> str:
    return _ESPN_TEAM_MAP.get(name, name)


async def sync_scores_from_espn(since: date | None = None) -> dict:
    """
    Fetch completed WC2026 results from ESPN and write scores/status to MongoDB.
    Returns {"updated": N, "checked": M, "skipped": K, "errors": [...]}.
    """
    db = get_db()
    start = since or WC2026_START
    today = date.today()

    updated = 0
    checked = 0
    skipped = 0
    errors: list[str] = []
    updated_matches: list[str] = []

    async with httpx.AsyncClient(timeout=15) as http:
        current = start
        while current <= today:
            date_key = current.strftime("%Y%m%d")
            date_iso = current.strftime("%Y-%m-%d")
            url = (
                "https://site.api.espn.com/apis/site/v2/sports/soccer/"
                f"fifa.world/scoreboard?dates={date_key}"
            )
            try:
                resp = await http.get(url)
                resp.raise_for_status()
                data = resp.json()
            except Exception as exc:
                errors.append(f"{date_iso}: fetch error — {exc}")
                current += timedelta(days=1)
                continue

            for event in data.get("events", []):
                comps = event.get("competitions", [])
                if not comps:
                    continue
                comp = comps[0]

                status_type = comp.get("status", {}).get("type", {})
                if not status_type.get("completed"):
                    skipped += 1
                    continue

                competitors = comp.get("competitors", [])
                if len(competitors) != 2:
                    continue

                c0, c1 = competitors[0], competitors[1]
                name0 = _norm(c0.get("team", {}).get("displayName", ""))
                name1 = _norm(c1.get("team", {}).get("displayName", ""))

                try:
                    score0 = int(c0.get("score") or 0)
                    score1 = int(c1.get("score") or 0)
                except (ValueError, TypeError):
                    continue

                checked += 1

                # Find match in MongoDB — our team_a/team_b order may differ from ESPN's
                match = await db.matches.find_one({
                    "$or": [
                        {"team_a": name0, "team_b": name1},
                        {"team_a": name1, "team_b": name0},
                    ],
                    "date": {"$regex": f"^{date_iso}"},
                })

                if not match:
                    # Case-insensitive fallback (handles accents/casing edge cases)
                    match = await db.matches.find_one({
                        "$or": [
                            {
                                "team_a": {"$regex": f"^{name0}$", "$options": "i"},
                                "team_b": {"$regex": f"^{name1}$", "$options": "i"},
                            },
                            {
                                "team_a": {"$regex": f"^{name1}$", "$options": "i"},
                                "team_b": {"$regex": f"^{name0}$", "$options": "i"},
                            },
                        ],
                    })

                if not match:
                    errors.append(f"{date_iso}: no DB match for '{name0}' vs '{name1}'")
                    continue

                # Align scores with our team_a / team_b order
                if match["team_a"].lower() == name0.lower():
                    score_a, score_b = score0, score1
                else:
                    score_a, score_b = score1, score0

                if score_a > score_b:
                    winner = match["team_a"]
                elif score_b > score_a:
                    winner = match["team_b"]
                else:
                    winner = None  # draw

                # Skip if already up to date
                if (
                    match.get("score_a") == score_a
                    and match.get("score_b") == score_b
                    and match.get("status") == "completed"
                ):
                    continue

                await db.matches.update_one(
                    {"_id": match["_id"]},
                    {"$set": {
                        "score_a": score_a,
                        "score_b": score_b,
                        "winner": winner,
                        "status": "completed",
                    }},
                )
                updated += 1
                label = f"{match['team_a']} {score_a}–{score_b} {match['team_b']} ({date_iso})"
                updated_matches.append(label)

            current += timedelta(days=1)

    return {
        "updated": updated,
        "checked": checked,
        "skipped": skipped,
        "matches": updated_matches,
        "errors": errors,
    }
