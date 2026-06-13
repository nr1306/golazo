import asyncio
import json
import os

from openai import AsyncOpenAI


def _make_city_guide_fallback(city: str, stadium: str, fan_zones: list) -> dict:
    fz = fan_zones[0] if fan_zones else f"{city} Fan Zone"
    return {
        "highlights": [
            {"name": f"{city} Historic District", "category": "Landmark", "best_time": "Morning", "tip": "Arrive early for cooler temps and no crowds"},
            {"name": f"{city} Central Market", "category": "Market", "best_time": "Morning", "tip": "Best spot for local street food and fresh coffee"},
            {"name": "City Waterfront / Park", "category": "Nature", "best_time": "Afternoon", "tip": "Great for a relaxed pre-match stroll with city views"},
            {"name": f"{city} Entertainment District", "category": "Nightlife", "best_time": "Evening", "tip": "Bars and restaurants pack out — book a table ahead"},
        ],
        "day_plan": [
            {"label": "Day Before Match", "places": [
                f"Walk {city} downtown and soak up the atmosphere",
                "Hit the local food market for breakfast",
                "Visit the city's main landmark or museum",
                "Rooftop bar for evening drinks and city views",
            ]},
            {"label": "Match Day", "places": [
                f"{fz} opens at noon — live music & fan chants",
                "Pre-match pub crawl with fellow supporters",
                f"Head to {stadium} 90 min before kickoff",
                "Soak in the stadium atmosphere as it builds",
            ]},
            {"label": "Day After", "places": [
                "Recovery brunch at a neighbourhood café",
                "City art gallery or history museum",
                "Browse the main street for souvenirs",
                "Sunset rooftop bar to relive match highlights",
            ]},
        ],
        "food_picks": [
            f"Street food stalls around {stadium} — match-day specials",
            "Local craft beer taproom in the entertainment quarter",
            f"Try {city}'s signature dish at a downtown restaurant",
            "Post-match late-night diner or food hall",
        ],
    }


async def _make_city_guide_ai(city: str, stadium: str, fan_zones: list, match_date: str) -> dict:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    fz_str = ", ".join(fan_zones) if fan_zones else f"{city} Fan Zone"

    prompt = f"""You are a travel expert for the 2026 FIFA World Cup. Generate a city guide for football fans attending a match in {city} at {stadium} on {match_date}. Fan zones nearby: {fz_str}.

Return a JSON object with exactly these keys:
{{
  "highlights": [
    {{"name": "real place name", "category": "Landmark|Market|Nature|Nightlife|Culture|Museum", "best_time": "Morning|Afternoon|Evening", "tip": "one helpful sentence"}}
  ],
  "day_plan": [
    {{"label": "Day Before Match", "places": ["specific activity 1", "specific activity 2", "specific activity 3", "specific activity 4"]}},
    {{"label": "Match Day", "places": ["specific activity 1", "specific activity 2", "specific activity 3", "specific activity 4"]}},
    {{"label": "Day After", "places": ["specific activity 1", "specific activity 2", "specific activity 3", "specific activity 4"]}}
  ],
  "food_picks": ["specific dish or restaurant 1", "specific dish or restaurant 2", "specific dish or restaurant 3", "specific dish or restaurant 4"]
}}

Use REAL, SPECIFIC places for {city}:
- Dallas: Deep Ellum, Pecan Lodge BBQ, Bishop Arts District, Reunion Tower GeO-Deck, Fair Park, Klyde Warren Park
- Miami: Wynwood Walls, Little Havana, Calle Ocho, Joe's Stone Crab, Brickell City Centre
- Los Angeles: Grand Central Market, Griffith Observatory, Echo Park, Koreatown, Olvera Street
- New York: Chelsea Market, High Line, Flushing Meadows, diverse Queens food scene
- Seattle: Pike Place Market, Space Needle, Capitol Hill, Fremont, Piroshky Piroshky
- San Francisco: Ferry Building Marketplace, Mission District, Fisherman's Wharf, Mission burritos
- Boston: Freedom Trail, Fenway area, Legal Sea Foods clam chowder, North End Italian
- Kansas City: Joe's Kansas City BBQ, Crossroads Arts District, Country Club Plaza, Arthur Bryant's
- Vancouver: Stanley Park, Granville Island Market, Gastown, poutine and sushi
- Toronto: Kensington Market, CN Tower, St Lawrence Market, multicultural Chinatown food
- Guadalajara: Centro Histórico, tequila distillery tours, birria tacos, Tlaquepaque artisan market
- Mexico City: Chapultepec Park, Zócalo, Mercado de La Merced, tacos al pastor"""

    response = await asyncio.wait_for(
        client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=1000,
        ),
        timeout=20,
    )
    return json.loads(response.choices[0].message.content)


async def generate_match_options(
    match_id_str: str,
    city: str,
    stadium: str,
    checkin: str,
    checkout: str,
    fan_zones: list,
    match_date: str = "",
) -> dict:
    from agent.tools.trip_planner import fetch_hotels_near_stadium

    hotels_task = fetch_hotels_near_stadium(city, checkin, checkout, max_results=10)
    guide_task = _make_city_guide_ai(city, stadium, fan_zones, match_date or checkin)

    hotels_result, city_guide = await asyncio.gather(hotels_task, guide_task, return_exceptions=True)

    hotels = hotels_result.get("hotels", []) if isinstance(hotels_result, dict) else []
    if isinstance(city_guide, Exception):
        city_guide = _make_city_guide_fallback(city, stadium, fan_zones)

    return {"hotels": hotels, "city_guide": city_guide}
