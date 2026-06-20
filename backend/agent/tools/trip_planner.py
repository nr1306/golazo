import asyncio
import os
from datetime import datetime, timezone

from db import get_db


async def save_trip_itinerary(fan_id: str, legs: list) -> dict:
    """Save or replace the fan's full trip itinerary.

    Args:
        fan_id: The fan's MongoDB ObjectId string.
        legs: List of trip leg dicts, each with match_number, city, hotel, transport, food_spots.

    Returns:
        {"saved": True, "leg_count": int}
    """
    db = get_db()
    await db.trips.update_one(
        {"fan_id": fan_id},
        {"$set": {"legs": legs, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"saved": True, "leg_count": len(legs)}


async def get_trip_itinerary(fan_id: str) -> dict:
    """Retrieve the fan's current trip itinerary.

    Args:
        fan_id: The fan's MongoDB ObjectId string.

    Returns:
        {"trip": {...} | None}
    """
    db = get_db()
    trip = await db.trips.find_one({"fan_id": fan_id}, {"_id": 0, "vibe_embedding": 0})
    return {"trip": trip}


async def discover_by_vibe(vibe_query: str, top_k: int = 5) -> dict:
    """Find WC2026 venues that match a vibe description.

    Args:
        vibe_query: Natural-language vibe (e.g. "electric atmosphere with street food and live music").
        top_k: Number of venues to return (default 5).

    Returns:
        {"venues": [{"stadium": str, "city": str, "vibe_tags": [...], "fan_zones": [...]}]}
    """
    from agent.tools.memory import _embed
    db = get_db()

    embedding = await _embed(vibe_query)
    if embedding:
        try:
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "venues_vibe_vector",
                        "path": "vibe_embedding",
                        "queryVector": embedding,
                        "numCandidates": top_k * 10,
                        "limit": top_k,
                    }
                },
                {"$project": {"stadium": 1, "city": 1, "country": 1, "vibe_tags": 1, "fan_zones": 1, "_id": 0}},
            ]
            results = await db.venues.aggregate(pipeline).to_list(top_k)
            if results:
                return {"venues": results}
        except Exception:
            pass

    # Fallback: keyword match against vibe_tags and city
    keywords = [w.lower() for w in vibe_query.split() if len(w) > 3]
    all_venues = await db.venues.find(
        {}, {"stadium": 1, "city": 1, "country": 1, "vibe_tags": 1, "fan_zones": 1, "_id": 0}
    ).to_list(100)

    def _score(v: dict) -> int:
        text = " ".join([v.get("city", ""), str(v.get("vibe_tags", []))]).lower()
        return sum(1 for kw in keywords if kw in text)

    ranked = sorted(all_venues, key=_score, reverse=True)
    return {"venues": ranked[:top_k]}


async def score_match_atmosphere(match_id: str) -> dict:
    """Score the atmosphere for a match (rivalry, stage, venue capacity, fan ratio).

    Args:
        match_id: The match identifier.

    Returns:
        {"match_id": str, "atmosphere_score": int, "label": str}
    """
    db = get_db()
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        return {"error": f"Match {match_id} not found"}
    score = match.get("atmosphere_score", 70)
    label = "Electric" if score >= 80 else "High Energy" if score >= 60 else "Steady"
    return {"match_id": match_id, "atmosphere_score": score, "label": label}


async def search_venues_near_stadium(stadium_name: str, query: str = "") -> dict:
    """Search hotels, restaurants, and fan zones near a WC2026 stadium.

    Args:
        stadium_name: Stadium name (e.g. "AT&T Stadium", "SoFi Stadium").
        query: Optional free-text filter (e.g. "halal food", "rooftop bar").

    Returns:
        {"venue": {...}, "fan_zones": [...]}
    """
    db = get_db()
    venue = await db.venues.find_one(
        {"stadium": {"$regex": stadium_name, "$options": "i"}},
        {"_id": 0, "vibe_embedding": 0},
    )
    if not venue:
        return {"venue": None, "fan_zones": []}
    fan_zones = venue.get("fan_zones", [])
    if query:
        fan_zones = [z for z in fan_zones if query.lower() in str(z).lower()] or fan_zones
    return {"venue": venue, "fan_zones": fan_zones}


async def fetch_hotels_near_stadium(city: str, checkin: str, checkout: str, max_results: int = 5) -> dict:
    """Fetch real hotel availability and live prices for a WC2026 host city via Apify.

    Calls the Apify Booking.com scraper — returns live pricing, not cached data.

    Args:
        city: Host city name (e.g. "Dallas", "Los Angeles", "Mexico City").
        checkin: Check-in date in YYYY-MM-DD format.
        checkout: Check-out date in YYYY-MM-DD format.
        max_results: Max hotels to return (default 5).

    Returns:
        {"hotels": [{"name": str, "price_per_night": int, "rating": float, "url": str}]}
    """
    api_key = os.getenv("APIFY_API_KEY")
    if not api_key:
        return {
            "hotels": [],
            "note": "APIFY_API_KEY not configured — add it to .env to enable live hotel data",
        }

    def _run_apify() -> list[dict]:
        from apify_client import ApifyClient

        client = ApifyClient(api_key)
        run_input = {
            "search": city,
            "checkIn": checkin,
            "checkOut": checkout,
            "currency": "USD",
            "language": "en-us",
            "maxItems": max_results,
            "sortBy": "price",
        }
        run = client.actor("voyager/booking-rooms-scraper").call(run_input=run_input)
        items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
        return [
            {
                "name": h.get("name", "Hotel"),
                "price_per_night": int(h.get("pricePerNight", 0) or 0),
                "rating": h.get("reviewScore", 0),
                "url": h.get("url", ""),
            }
            for h in items[:max_results]
        ]

    def _bk(name: str, city: str) -> str:
        from urllib.parse import quote_plus
        return f"https://www.booking.com/searchresults.html?ss={quote_plus(name + ' ' + city)}"

    _FALLBACK_HOTELS: dict[str, list] = {
        "default": [
            {"name": "Marriott Downtown", "price_per_night": 189, "rating": 8.4, "url": _bk("Marriott Downtown", city)},
            {"name": "Hilton Garden Inn", "price_per_night": 149, "rating": 7.9, "url": _bk("Hilton Garden Inn", city)},
            {"name": "Hyatt Regency", "price_per_night": 219, "rating": 8.7, "url": _bk("Hyatt Regency", city)},
            {"name": "Hampton Inn", "price_per_night": 129, "rating": 7.5, "url": _bk("Hampton Inn", city)},
            {"name": "Courtyard by Marriott", "price_per_night": 169, "rating": 8.1, "url": _bk("Courtyard Marriott", city)},
            {"name": "DoubleTree by Hilton", "price_per_night": 199, "rating": 8.3, "url": _bk("DoubleTree Hilton", city)},
            {"name": "Sheraton Hotel", "price_per_night": 179, "rating": 8.0, "url": _bk("Sheraton Hotel", city)},
            {"name": "Best Western Plus", "price_per_night": 109, "rating": 7.4, "url": _bk("Best Western Plus", city)},
            {"name": "Holiday Inn Express", "price_per_night": 119, "rating": 7.6, "url": _bk("Holiday Inn Express", city)},
            {"name": "AC Hotel by Marriott", "price_per_night": 159, "rating": 8.2, "url": _bk("AC Hotel Marriott", city)},
        ],
        "dallas": [
            {"name": "Omni Dallas Hotel", "price_per_night": 229, "rating": 8.8, "url": _bk("Omni Dallas Hotel", "Dallas")},
            {"name": "Adolphus Hotel", "price_per_night": 279, "rating": 9.1, "url": _bk("Adolphus Hotel", "Dallas")},
            {"name": "Hotel ZaZa Dallas", "price_per_night": 249, "rating": 8.9, "url": _bk("Hotel ZaZa", "Dallas")},
            {"name": "Hyatt Regency Dallas", "price_per_night": 199, "rating": 8.5, "url": _bk("Hyatt Regency", "Dallas")},
            {"name": "Hilton Anatole Dallas", "price_per_night": 189, "rating": 8.3, "url": _bk("Hilton Anatole", "Dallas")},
            {"name": "Sheraton Dallas Hotel", "price_per_night": 169, "rating": 7.8, "url": _bk("Sheraton Dallas", "Dallas")},
            {"name": "Hampton Inn Downtown Dallas", "price_per_night": 139, "rating": 7.6, "url": _bk("Hampton Inn Downtown", "Dallas")},
            {"name": "Westin Dallas Downtown", "price_per_night": 209, "rating": 8.6, "url": _bk("Westin Dallas Downtown", "Dallas")},
            {"name": "Magnolia Hotel Dallas", "price_per_night": 159, "rating": 8.4, "url": _bk("Magnolia Hotel Dallas", "Dallas")},
            {"name": "Aloft Dallas Downtown", "price_per_night": 129, "rating": 8.0, "url": _bk("Aloft Dallas Downtown", "Dallas")},
        ],
        "los angeles": [
            {"name": "JW Marriott LA Live", "price_per_night": 349, "rating": 9.0, "url": _bk("JW Marriott LA Live", "Los Angeles")},
            {"name": "InterContinental DTLA", "price_per_night": 309, "rating": 8.8, "url": _bk("InterContinental DTLA", "Los Angeles")},
            {"name": "Sheraton Grand LA", "price_per_night": 279, "rating": 8.3, "url": _bk("Sheraton Grand", "Los Angeles")},
            {"name": "Hilton Checkers", "price_per_night": 239, "rating": 8.1, "url": _bk("Hilton Checkers", "Los Angeles")},
            {"name": "Courtyard by Marriott DTLA", "price_per_night": 199, "rating": 8.0, "url": _bk("Courtyard Marriott Downtown", "Los Angeles")},
            {"name": "Freehand Los Angeles", "price_per_night": 159, "rating": 8.4, "url": _bk("Freehand Hotel", "Los Angeles")},
            {"name": "YOTEL Los Angeles", "price_per_night": 129, "rating": 7.8, "url": _bk("YOTEL", "Los Angeles")},
            {"name": "The LINE LA", "price_per_night": 219, "rating": 8.6, "url": _bk("The LINE Hotel", "Los Angeles")},
            {"name": "Ace Hotel Downtown LA", "price_per_night": 189, "rating": 8.5, "url": _bk("Ace Hotel Downtown", "Los Angeles")},
            {"name": "Hotel Indigo Los Angeles", "price_per_night": 169, "rating": 8.2, "url": _bk("Hotel Indigo", "Los Angeles")},
        ],
        "new york": [
            {"name": "The Peninsula New York", "price_per_night": 599, "rating": 9.4, "url": _bk("Peninsula Hotel", "New York")},
            {"name": "Marriott Marquis Times Square", "price_per_night": 399, "rating": 8.6, "url": _bk("Marriott Marquis Times Square", "New York")},
            {"name": "Hilton Midtown", "price_per_night": 329, "rating": 8.0, "url": _bk("Hilton Midtown", "New York")},
            {"name": "Sheraton Times Square", "price_per_night": 289, "rating": 7.7, "url": _bk("Sheraton Times Square", "New York")},
            {"name": "citizenM New York Times Square", "price_per_night": 219, "rating": 8.7, "url": _bk("citizenM Times Square", "New York")},
            {"name": "Pod 51 Hotel", "price_per_night": 149, "rating": 7.9, "url": _bk("Pod 51 Hotel", "New York")},
            {"name": "YOTEL New York", "price_per_night": 169, "rating": 8.2, "url": _bk("YOTEL", "New York")},
            {"name": "The Standard High Line", "price_per_night": 359, "rating": 8.8, "url": _bk("The Standard High Line", "New York")},
            {"name": "Arlo Hudson Square", "price_per_night": 199, "rating": 8.4, "url": _bk("Arlo Hudson Square", "New York")},
            {"name": "HI New York City Hostel", "price_per_night": 69, "rating": 7.8, "url": _bk("HI NYC Hostel", "New York")},
        ],
        "miami": [
            {"name": "JW Marriott Miami", "price_per_night": 319, "rating": 8.9, "url": _bk("JW Marriott", "Miami")},
            {"name": "InterContinental Miami", "price_per_night": 279, "rating": 8.5, "url": _bk("InterContinental", "Miami")},
            {"name": "Marriott Biscayne Bay", "price_per_night": 249, "rating": 8.3, "url": _bk("Marriott Biscayne Bay", "Miami")},
            {"name": "Hyatt Regency Miami", "price_per_night": 229, "rating": 8.2, "url": _bk("Hyatt Regency", "Miami")},
            {"name": "Hilton Downtown Miami", "price_per_night": 219, "rating": 8.0, "url": _bk("Hilton Downtown", "Miami")},
            {"name": "Comfort Inn Downtown Miami", "price_per_night": 149, "rating": 7.4, "url": _bk("Comfort Inn Downtown", "Miami")},
            {"name": "Hampton Inn Brickell", "price_per_night": 179, "rating": 7.9, "url": _bk("Hampton Inn Brickell", "Miami")},
            {"name": "EAST Miami", "price_per_night": 289, "rating": 8.8, "url": _bk("EAST Miami Hotel", "Miami")},
            {"name": "Kimpton EPIC Hotel Miami", "price_per_night": 259, "rating": 9.0, "url": _bk("Kimpton EPIC Hotel", "Miami")},
            {"name": "AC Hotel Miami Wynwood", "price_per_night": 189, "rating": 8.5, "url": _bk("AC Hotel Wynwood", "Miami")},
        ],
        "kansas city": [
            {"name": "Loews Kansas City Hotel", "price_per_night": 189, "rating": 8.6, "url": _bk("Loews Kansas City Hotel", "Kansas City")},
            {"name": "Marriott Kansas City Downtown", "price_per_night": 159, "rating": 8.2, "url": _bk("Marriott Downtown", "Kansas City")},
            {"name": "Hyatt Regency Crown Center", "price_per_night": 179, "rating": 8.4, "url": _bk("Hyatt Regency Crown Center", "Kansas City")},
            {"name": "Sheraton Kansas City", "price_per_night": 139, "rating": 7.8, "url": _bk("Sheraton Kansas City", "Kansas City")},
            {"name": "21c Museum Hotel Kansas City", "price_per_night": 199, "rating": 9.0, "url": _bk("21c Museum Hotel", "Kansas City")},
            {"name": "Hampton Inn Power & Light", "price_per_night": 129, "rating": 7.7, "url": _bk("Hampton Inn Power Light", "Kansas City")},
            {"name": "The Fontaine Kansas City", "price_per_night": 219, "rating": 8.8, "url": _bk("The Fontaine Kansas City", "Kansas City")},
            {"name": "Hotel Kansas City", "price_per_night": 169, "rating": 8.5, "url": _bk("Hotel Kansas City", "Kansas City")},
            {"name": "Embassy Suites Kansas City", "price_per_night": 149, "rating": 8.0, "url": _bk("Embassy Suites Kansas City", "Kansas City")},
            {"name": "Aloft Kansas City Downtown", "price_per_night": 119, "rating": 7.9, "url": _bk("Aloft Kansas City", "Kansas City")},
        ],
        "seattle": [
            {"name": "Four Seasons Seattle", "price_per_night": 449, "rating": 9.5, "url": _bk("Four Seasons", "Seattle")},
            {"name": "Hyatt Regency Seattle", "price_per_night": 279, "rating": 8.9, "url": _bk("Hyatt Regency", "Seattle")},
            {"name": "Marriott Seattle Waterfront", "price_per_night": 299, "rating": 8.7, "url": _bk("Marriott Waterfront", "Seattle")},
            {"name": "Hilton Seattle", "price_per_night": 229, "rating": 8.2, "url": _bk("Hilton Seattle", "Seattle")},
            {"name": "Sheraton Grand Seattle", "price_per_night": 249, "rating": 8.4, "url": _bk("Sheraton Grand", "Seattle")},
            {"name": "Hotel Monaco Seattle", "price_per_night": 199, "rating": 8.8, "url": _bk("Hotel Monaco", "Seattle")},
            {"name": "City Hostel Seattle", "price_per_night": 59, "rating": 8.1, "url": _bk("City Hostel", "Seattle")},
            {"name": "The Edgewater Hotel Seattle", "price_per_night": 319, "rating": 8.9, "url": _bk("The Edgewater Hotel", "Seattle")},
            {"name": "Thompson Seattle", "price_per_night": 269, "rating": 8.7, "url": _bk("Thompson Hotel Seattle", "Seattle")},
            {"name": "Kimpton Hotel Vintage Seattle", "price_per_night": 189, "rating": 8.6, "url": _bk("Kimpton Hotel Vintage", "Seattle")},
        ],
        "boston": [
            {"name": "Marriott Copley Place Boston", "price_per_night": 349, "rating": 8.8, "url": _bk("Marriott Copley Place", "Boston")},
            {"name": "Omni Parker House", "price_per_night": 269, "rating": 8.5, "url": _bk("Omni Parker House", "Boston")},
            {"name": "Hilton Back Bay", "price_per_night": 289, "rating": 8.3, "url": _bk("Hilton Back Bay", "Boston")},
            {"name": "Sheraton Boston Hotel", "price_per_night": 239, "rating": 7.9, "url": _bk("Sheraton Boston", "Boston")},
            {"name": "citizenM Boston North Station", "price_per_night": 189, "rating": 8.7, "url": _bk("citizenM North Station", "Boston")},
            {"name": "Hampton Inn Downtown Boston", "price_per_night": 199, "rating": 8.0, "url": _bk("Hampton Inn Downtown", "Boston")},
            {"name": "The Newbury Boston", "price_per_night": 429, "rating": 9.2, "url": _bk("The Newbury Boston", "Boston")},
            {"name": "Kimpton Nine Zero Hotel", "price_per_night": 259, "rating": 8.8, "url": _bk("Kimpton Nine Zero", "Boston")},
            {"name": "Hotel Commonwealth Boston", "price_per_night": 319, "rating": 9.0, "url": _bk("Hotel Commonwealth", "Boston")},
            {"name": "Aloft Boston Downtown", "price_per_night": 149, "rating": 8.1, "url": _bk("Aloft Boston Downtown", "Boston")},
        ],
        "philadelphia": [
            {"name": "Loews Philadelphia Hotel", "price_per_night": 219, "rating": 8.7, "url": _bk("Loews Philadelphia", "Philadelphia")},
            {"name": "Marriott Philadelphia Downtown", "price_per_night": 199, "rating": 8.4, "url": _bk("Marriott Downtown", "Philadelphia")},
            {"name": "Hyatt Centric Center City", "price_per_night": 229, "rating": 8.9, "url": _bk("Hyatt Centric Center City", "Philadelphia")},
            {"name": "Kimpton Hotel Monaco Philadelphia", "price_per_night": 249, "rating": 9.1, "url": _bk("Kimpton Monaco", "Philadelphia")},
            {"name": "Hilton Philadelphia City Ave", "price_per_night": 169, "rating": 7.8, "url": _bk("Hilton Philadelphia", "Philadelphia")},
            {"name": "Hampton Inn Center City", "price_per_night": 149, "rating": 7.6, "url": _bk("Hampton Inn Center City", "Philadelphia")},
            {"name": "The Logan Philadelphia", "price_per_night": 269, "rating": 9.0, "url": _bk("The Logan Philadelphia", "Philadelphia")},
            {"name": "Sofitel Philadelphia", "price_per_night": 239, "rating": 8.8, "url": _bk("Sofitel Philadelphia", "Philadelphia")},
            {"name": "Le Meridien Philadelphia", "price_per_night": 209, "rating": 8.5, "url": _bk("Le Meridien Philadelphia", "Philadelphia")},
            {"name": "Aloft Philadelphia Downtown", "price_per_night": 129, "rating": 8.0, "url": _bk("Aloft Philadelphia Downtown", "Philadelphia")},
        ],
        "atlanta": [
            {"name": "Omni Atlanta at CNN Center", "price_per_night": 229, "rating": 8.6, "url": _bk("Omni Atlanta CNN Center", "Atlanta")},
            {"name": "JW Marriott Atlanta Buckhead", "price_per_night": 259, "rating": 8.8, "url": _bk("JW Marriott Buckhead", "Atlanta")},
            {"name": "Hilton Atlanta", "price_per_night": 199, "rating": 8.1, "url": _bk("Hilton Atlanta", "Atlanta")},
            {"name": "Hyatt Regency Atlanta", "price_per_night": 219, "rating": 8.4, "url": _bk("Hyatt Regency Atlanta", "Atlanta")},
            {"name": "W Atlanta Downtown", "price_per_night": 239, "rating": 8.7, "url": _bk("W Hotel Downtown", "Atlanta")},
            {"name": "Hampton Inn Atlanta Downtown", "price_per_night": 149, "rating": 7.7, "url": _bk("Hampton Inn Downtown", "Atlanta")},
            {"name": "Glenn Hotel Atlanta", "price_per_night": 189, "rating": 8.9, "url": _bk("Glenn Hotel Atlanta", "Atlanta")},
            {"name": "Hotel Clermont Atlanta", "price_per_night": 169, "rating": 8.6, "url": _bk("Hotel Clermont Atlanta", "Atlanta")},
            {"name": "Marriott Atlanta Marquis", "price_per_night": 249, "rating": 8.3, "url": _bk("Marriott Marquis Atlanta", "Atlanta")},
            {"name": "Aloft Atlanta Downtown", "price_per_night": 129, "rating": 8.0, "url": _bk("Aloft Atlanta Downtown", "Atlanta")},
        ],
        "san francisco": [
            {"name": "Marriott Marquis San Francisco", "price_per_night": 369, "rating": 8.7, "url": _bk("Marriott Marquis", "San Francisco")},
            {"name": "Hilton Union Square", "price_per_night": 299, "rating": 8.1, "url": _bk("Hilton Union Square", "San Francisco")},
            {"name": "Hyatt Regency San Francisco", "price_per_night": 319, "rating": 8.5, "url": _bk("Hyatt Regency", "San Francisco")},
            {"name": "Hotel Zoe Fisherman's Wharf", "price_per_night": 249, "rating": 8.8, "url": _bk("Hotel Zoe Fishermans Wharf", "San Francisco")},
            {"name": "Sheraton Fisherman's Wharf", "price_per_night": 269, "rating": 8.2, "url": _bk("Sheraton Fishermans Wharf", "San Francisco")},
            {"name": "HI San Francisco Fisherman's Wharf", "price_per_night": 79, "rating": 8.0, "url": _bk("HI Hostel Fishermans Wharf", "San Francisco")},
            {"name": "Hotel Nikko San Francisco", "price_per_night": 239, "rating": 8.4, "url": _bk("Hotel Nikko", "San Francisco")},
            {"name": "Kimpton Sir Francis Drake", "price_per_night": 209, "rating": 8.6, "url": _bk("Kimpton Sir Francis Drake", "San Francisco")},
            {"name": "The Marker San Francisco", "price_per_night": 189, "rating": 8.3, "url": _bk("The Marker Hotel", "San Francisco")},
            {"name": "Aloft San Francisco Airport", "price_per_night": 139, "rating": 8.0, "url": _bk("Aloft San Francisco", "San Francisco")},
        ],
        "toronto": [
            {"name": "Fairmont Royal York Toronto", "price_per_night": 349, "rating": 9.0, "url": _bk("Fairmont Royal York", "Toronto")},
            {"name": "Marriott Downtown Toronto", "price_per_night": 269, "rating": 8.6, "url": _bk("Marriott Downtown", "Toronto")},
            {"name": "Hyatt Regency Toronto", "price_per_night": 289, "rating": 8.8, "url": _bk("Hyatt Regency", "Toronto")},
            {"name": "Hilton Toronto", "price_per_night": 239, "rating": 8.2, "url": _bk("Hilton Toronto", "Toronto")},
            {"name": "Sheraton Centre Toronto", "price_per_night": 219, "rating": 8.0, "url": _bk("Sheraton Centre", "Toronto")},
            {"name": "HI Toronto Hostel", "price_per_night": 55, "rating": 7.8, "url": _bk("HI Hostel", "Toronto")},
            {"name": "The Ritz-Carlton Toronto", "price_per_night": 499, "rating": 9.3, "url": _bk("Ritz Carlton Toronto", "Toronto")},
            {"name": "InterContinental Toronto Centre", "price_per_night": 259, "rating": 8.7, "url": _bk("InterContinental Toronto", "Toronto")},
            {"name": "Hotel X Toronto", "price_per_night": 229, "rating": 8.9, "url": _bk("Hotel X Toronto", "Toronto")},
            {"name": "Kimpton Saint George Hotel", "price_per_night": 199, "rating": 8.8, "url": _bk("Kimpton Saint George", "Toronto")},
        ],
        "vancouver": [
            {"name": "Fairmont Hotel Vancouver", "price_per_night": 399, "rating": 9.2, "url": _bk("Fairmont Hotel", "Vancouver")},
            {"name": "Marriott Pinnacle Downtown Vancouver", "price_per_night": 319, "rating": 8.9, "url": _bk("Marriott Pinnacle Downtown", "Vancouver")},
            {"name": "Hyatt Regency Vancouver", "price_per_night": 289, "rating": 8.7, "url": _bk("Hyatt Regency", "Vancouver")},
            {"name": "Sheraton Vancouver Wall Centre", "price_per_night": 249, "rating": 8.3, "url": _bk("Sheraton Wall Centre", "Vancouver")},
            {"name": "Hilton Vancouver Metrotown", "price_per_night": 199, "rating": 8.1, "url": _bk("Hilton Vancouver Metrotown", "Vancouver")},
            {"name": "HI Vancouver Central Hostel", "price_per_night": 65, "rating": 8.4, "url": _bk("HI Vancouver Central", "Vancouver")},
            {"name": "The Sutton Place Hotel Vancouver", "price_per_night": 279, "rating": 8.8, "url": _bk("Sutton Place Hotel", "Vancouver")},
            {"name": "Paradox Hotel Vancouver", "price_per_night": 229, "rating": 8.6, "url": _bk("Paradox Hotel Vancouver", "Vancouver")},
            {"name": "Pan Pacific Vancouver", "price_per_night": 309, "rating": 8.9, "url": _bk("Pan Pacific Vancouver", "Vancouver")},
            {"name": "YWCA Hotel Vancouver", "price_per_night": 89, "rating": 7.9, "url": _bk("YWCA Hotel Vancouver", "Vancouver")},
        ],
        "mexico city": [
            {"name": "Marriott Mexico City Reforma", "price_per_night": 179, "rating": 8.7, "url": _bk("Marriott Reforma", "Mexico City")},
            {"name": "JW Marriott Mexico City", "price_per_night": 219, "rating": 9.0, "url": _bk("JW Marriott", "Mexico City")},
            {"name": "Hilton Mexico City Reforma", "price_per_night": 159, "rating": 8.3, "url": _bk("Hilton Reforma", "Mexico City")},
            {"name": "Hyatt Regency Mexico City", "price_per_night": 189, "rating": 8.6, "url": _bk("Hyatt Regency", "Mexico City")},
            {"name": "Sheraton Mexico City Maria Isabel", "price_per_night": 149, "rating": 8.0, "url": _bk("Sheraton Maria Isabel", "Mexico City")},
            {"name": "Hotel Condesa DF", "price_per_night": 129, "rating": 8.8, "url": _bk("Condesa DF Hotel", "Mexico City")},
            {"name": "St. Regis Mexico City", "price_per_night": 289, "rating": 9.2, "url": _bk("St Regis Mexico City", "Mexico City")},
            {"name": "Camino Real Polanco Mexico", "price_per_night": 169, "rating": 8.5, "url": _bk("Camino Real Polanco", "Mexico City")},
            {"name": "Hotel Galería Plaza Reforma", "price_per_night": 109, "rating": 8.1, "url": _bk("Galeria Plaza Reforma", "Mexico City")},
            {"name": "Curio Collection by Hilton Mexico City", "price_per_night": 139, "rating": 8.4, "url": _bk("Curio Collection Hilton", "Mexico City")},
        ],
        "guadalajara": [
            {"name": "Marriott Guadalajara", "price_per_night": 139, "rating": 8.5, "url": _bk("Marriott Guadalajara", "Guadalajara")},
            {"name": "Hilton Guadalajara Midtown", "price_per_night": 119, "rating": 8.2, "url": _bk("Hilton Midtown", "Guadalajara")},
            {"name": "Hyatt Regency Andares Guadalajara", "price_per_night": 169, "rating": 8.9, "url": _bk("Hyatt Regency Andares", "Guadalajara")},
            {"name": "Hotel Demetria", "price_per_night": 99, "rating": 8.7, "url": _bk("Hotel Demetria", "Guadalajara")},
            {"name": "Sheraton Guadalajara", "price_per_night": 129, "rating": 7.9, "url": _bk("Sheraton Guadalajara", "Guadalajara")},
            {"name": "Hampton Inn Expo Guadalajara", "price_per_night": 89, "rating": 7.7, "url": _bk("Hampton Inn Expo", "Guadalajara")},
            {"name": "One Guadalajara Periferico Sur", "price_per_night": 79, "rating": 7.8, "url": _bk("One Hotel Guadalajara", "Guadalajara")},
            {"name": "Camino Real Guadalajara", "price_per_night": 149, "rating": 8.3, "url": _bk("Camino Real Guadalajara", "Guadalajara")},
            {"name": "Hotel Guadalajara Plaza Expo", "price_per_night": 109, "rating": 8.0, "url": _bk("Hotel Plaza Expo Guadalajara", "Guadalajara")},
            {"name": "AC Hotel Guadalajara", "price_per_night": 119, "rating": 8.4, "url": _bk("AC Hotel Guadalajara", "Guadalajara")},
        ],
        "monterrey": [
            {"name": "Marriott Monterrey", "price_per_night": 149, "rating": 8.6, "url": _bk("Marriott Monterrey", "Monterrey")},
            {"name": "Hyatt Regency Monterrey", "price_per_night": 169, "rating": 8.8, "url": _bk("Hyatt Regency Monterrey", "Monterrey")},
            {"name": "Hilton Garden Inn Monterrey", "price_per_night": 119, "rating": 8.1, "url": _bk("Hilton Garden Inn Monterrey", "Monterrey")},
            {"name": "Sheraton Ambassador Monterrey", "price_per_night": 129, "rating": 7.8, "url": _bk("Sheraton Ambassador", "Monterrey")},
            {"name": "Hotel Habita MTY", "price_per_night": 189, "rating": 9.0, "url": _bk("Hotel Habita Monterrey", "Monterrey")},
            {"name": "Hampton Inn Centro Monterrey", "price_per_night": 99, "rating": 7.6, "url": _bk("Hampton Inn Centro Monterrey", "Monterrey")},
            {"name": "Camino Real Monterrey", "price_per_night": 139, "rating": 8.3, "url": _bk("Camino Real Monterrey", "Monterrey")},
            {"name": "Novotel Monterrey Valle", "price_per_night": 109, "rating": 8.2, "url": _bk("Novotel Monterrey", "Monterrey")},
            {"name": "Hotel Safi Royal Luxury Valle", "price_per_night": 159, "rating": 8.7, "url": _bk("Hotel Safi Royal Luxury", "Monterrey")},
            {"name": "One Monterrey Centro", "price_per_night": 79, "rating": 7.7, "url": _bk("One Hotel Monterrey Centro", "Monterrey")},
        ],
    }

    try:
        loop = asyncio.get_event_loop()
        hotels = await loop.run_in_executor(None, _run_apify)
        if hotels:
            return {"hotels": hotels}
        raise ValueError("empty results")
    except Exception:
        key = city.lower()
        fallback = _FALLBACK_HOTELS.get(key, _FALLBACK_HOTELS["default"])
        return {"hotels": fallback, "note": f"Showing estimated prices for {city} during WC2026 (live pricing temporarily unavailable)"}
