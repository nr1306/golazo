from db import get_db


async def get_crowd_insights(city: str) -> dict:
    """Get anonymised crowd intelligence for a WC2026 host city.

    Uses MongoDB aggregation pipeline over the trips collection to surface
    where fans are staying, average prices, and booking hotspots.

    Args:
        city: Host city name (e.g. "Dallas", "Los Angeles", "Toronto").

    Returns:
        {
            "fans_booked": int,
            "top_neighbourhoods": [str],
            "avg_hotel_price": int,
            "overbooked_zones": [str],
            "budget_tip": str
        }
    """
    db = get_db()
    pipeline = [
        {"$match": {"legs.city": {"$regex": city, "$options": "i"}}},
        {"$unwind": "$legs"},
        {"$match": {"legs.city": {"$regex": city, "$options": "i"}}},
        {
            "$group": {
                "_id": "$legs.city",
                "fans_booked": {"$sum": 1},
                "avg_hotel_price": {"$avg": "$legs.hotel.price_per_night"},
                "neighbourhoods": {"$addToSet": "$legs.hotel.name"},
            }
        },
    ]
    results = await db.trips.aggregate(pipeline).to_list(1)

    if not results:
        return {
            "fans_booked": 0,
            "top_neighbourhoods": [],
            "avg_hotel_price": 0,
            "overbooked_zones": [],
            "budget_tip": f"No crowd data for {city} yet — book early, prices will rise!",
        }

    row = results[0]
    avg_price = int(row.get("avg_hotel_price") or 0)
    neighbourhoods = row.get("neighbourhoods", [])[:4]

    overbooked = []
    if avg_price > 300:
        overbooked = ["Downtown core"]

    tip = (
        f"Avg hotel in {city} is ${avg_price}/night — consider neighbourhoods further from the stadium for savings."
        if avg_price > 150
        else f"Hotel prices in {city} are still reasonable — book now before they spike!"
    )

    return {
        "fans_booked": row.get("fans_booked", 0),
        "top_neighbourhoods": neighbourhoods,
        "avg_hotel_price": avg_price,
        "overbooked_zones": overbooked,
        "budget_tip": tip,
    }
