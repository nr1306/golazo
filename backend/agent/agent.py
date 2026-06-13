from pathlib import Path

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from agent.tools.crowd import get_crowd_insights
from agent.tools.fantasy import manage_fantasy_roster, suggest_lineup
from agent.tools.match_briefing import (
    find_matches_near_me,
    get_match_day_briefing,
    get_matches_by_city,
    get_matches_by_team,
)
from agent.tools.memory import recall_memory, remember
from agent.tools.players import get_fantasy_roster, search_players
from agent.tools.proactive import apply_approved_action, create_fan_profile, propose_action
from agent.tools.trip_planner import (
    discover_by_vibe,
    fetch_hotels_near_stadium,
    get_trip_itinerary,
    save_trip_itinerary,
    score_match_atmosphere,
    search_venues_near_stadium,
)

_SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "system_prompt.txt").read_text()

MODEL = LiteLlm(model="openai/gpt-4o-mini")

trip_agent = LlmAgent(
    name="trip_agent",
    model=MODEL,
    description="Plans and updates multi-city WC2026 trip itineraries.",
    instruction=(
        "You build perfect World Cup trips. Use trip tools to find matches, "
        "discover venues by vibe, and propose itinerary changes. "
        "Always use propose_action for any trip modification — never save directly."
    ),
    tools=[
        get_matches_by_team,
        find_matches_near_me,
        discover_by_vibe,
        save_trip_itinerary,
        get_trip_itinerary,
        score_match_atmosphere,
        search_venues_near_stadium,
        fetch_hotels_near_stadium,
        propose_action,
    ],
)

briefing_agent = LlmAgent(
    name="briefing_agent",
    model=MODEL,
    description="Delivers vivid match-day briefings: fixture, venue, atmosphere, fan tips.",
    instruction=(
        "You deliver concise match-day briefings. Include kickoff time, stadium transport, "
        "fan zone locations, atmosphere score, and one local food tip."
    ),
    tools=[get_match_day_briefing, get_matches_by_team, get_matches_by_city],
)

fantasy_agent = LlmAgent(
    name="fantasy_agent",
    model=MODEL,
    description="Manages WC2026 fantasy rosters and suggests starting lineups.",
    instruction=(
        "Help fans build and optimise their fantasy squad. "
        "Always call search_players first to find player_ids before calling manage_fantasy_roster. "
        "Call get_fantasy_roster to show the fan their current squad. "
        "Suggest players by form and availability. Keep advice brief and punchy."
    ),
    tools=[search_players, manage_fantasy_roster, suggest_lineup, get_fantasy_roster],
)

crowd_agent = LlmAgent(
    name="crowd_agent",
    model=MODEL,
    description="Provides anonymised fan crowd intelligence: hotel prices, booking trends, tips.",
    instruction=(
        "Surface crowd trends to help fans make smart decisions. "
        "Always present data as anonymised aggregates — never individual fan data."
    ),
    tools=[get_crowd_insights],
)

orchestrator = LlmAgent(
    name="golazo_orchestrator",
    model=MODEL,
    description="World Cup 2026 AI fan companion — main orchestrator.",
    instruction=_SYSTEM_PROMPT,
    sub_agents=[trip_agent, briefing_agent, fantasy_agent, crowd_agent],
    tools=[
        recall_memory,
        remember,
        create_fan_profile,
        apply_approved_action,
        get_matches_by_team,
        get_matches_by_city,
    ],
)

APP_NAME = "golazo"
session_service = InMemorySessionService()
runner = Runner(agent=orchestrator, app_name=APP_NAME, session_service=session_service)
