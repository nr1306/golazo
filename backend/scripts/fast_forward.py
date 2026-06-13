"""Simulate a match finishing to trigger the Atlas Database Trigger.

Usage:
    python backend/scripts/fast_forward.py --match-id WC2026-001 --winner "Mexico"

The script updates matches.status = "finished" and sets the winner.
The Atlas Trigger fires within ~3-5 seconds and calls /webhook/match-finished.
"""

import argparse
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent.parent / ".env")


async def fast_forward(match_id: str, winner: str, score_a: int, score_b: int) -> None:
    client = AsyncIOMotorClient(os.environ["MONGODB_URI"])
    db = client[os.getenv("MONGODB_DB", "golazo")]

    match = await db.matches.find_one({"match_id": match_id})
    if not match:
        print(f"Match {match_id} not found")
        client.close()
        return

    result = await db.matches.update_one(
        {"match_id": match_id},
        {
            "$set": {
                "status": "finished",
                "winner": winner,
                "score_a": score_a,
                "score_b": score_b,
            }
        },
    )
    if result.modified_count:
        print(
            f"Match {match_id} ({match['team_a']} vs {match['team_b']}) set to finished. "
            f"Winner: {winner} ({score_a}-{score_b})"
        )
        print("Atlas Trigger will fire in ~3-5 seconds -> POST /webhook/match-finished")
    else:
        print("No update made (already finished?)")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fast-forward a WC2026 match to finished")
    parser.add_argument("--match-id", required=True, help="e.g. WC2026-001")
    parser.add_argument("--winner", required=True, help="Winning team name")
    parser.add_argument("--score-a", type=int, default=2, help="Goals scored by team_a")
    parser.add_argument("--score-b", type=int, default=1, help="Goals scored by team_b")
    args = parser.parse_args()
    asyncio.run(fast_forward(args.match_id, args.winner, args.score_a, args.score_b))
