"""
Generate matches_seed.json with the full real FIFA World Cup 2026 schedule (104 matches).
Source: Al Jazeera / official FIFA schedule as of June 2026.
Run: python backend/data/generate_matches_seed.py
"""
import json
from pathlib import Path

# ── Venue lookup ──────────────────────────────────────────────────────────────
VENUES = {
    "Mexico City":    {"stadium": "Estadio Azteca",         "city": "Mexico City",   "country": "Mexico"},
    "Guadalajara":    {"stadium": "Estadio Akron",          "city": "Guadalajara",   "country": "Mexico"},
    "Monterrey":      {"stadium": "Estadio BBVA",           "city": "Monterrey",     "country": "Mexico"},
    "East Rutherford":{"stadium": "MetLife Stadium",        "city": "East Rutherford","country": "USA"},
    "Los Angeles":    {"stadium": "SoFi Stadium",           "city": "Los Angeles",   "country": "USA"},
    "Arlington":      {"stadium": "AT&T Stadium",           "city": "Arlington",     "country": "USA"},
    "Santa Clara":    {"stadium": "Levi's Stadium",         "city": "Santa Clara",   "country": "USA"},
    "Kansas City":    {"stadium": "Arrowhead Stadium",      "city": "Kansas City",   "country": "USA"},
    "Houston":        {"stadium": "NRG Stadium",            "city": "Houston",       "country": "USA"},
    "Philadelphia":   {"stadium": "Lincoln Financial Field","city": "Philadelphia",  "country": "USA"},
    "Boston":         {"stadium": "Gillette Stadium",       "city": "Boston",        "country": "USA"},
    "Seattle":        {"stadium": "Lumen Field",            "city": "Seattle",       "country": "USA"},
    "Miami":          {"stadium": "Hard Rock Stadium",      "city": "Miami",         "country": "USA"},
    "Atlanta":        {"stadium": "Mercedes-Benz Stadium",  "city": "Atlanta",       "country": "USA"},
    "Toronto":        {"stadium": "BMO Field",              "city": "Toronto",       "country": "Canada"},
    "Vancouver":      {"stadium": "BC Place",               "city": "Vancouver",     "country": "Canada"},
}

# ── Groups ────────────────────────────────────────────────────────────────────
GROUPS = {
    "A": ["Mexico", "South Africa", "South Korea", "Czechia"],
    "B": ["Canada", "Bosnia", "Switzerland", "Qatar"],
    "C": ["USA", "Paraguay", "Turkey", "Australia"],
    "D": ["Germany", "Curacao", "Ivory Coast", "Ecuador"],
    "E": ["Netherlands", "Japan", "Sweden", "Tunisia"],
    "F": ["Spain", "Saudi Arabia", "Uruguay", "Cape Verde"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["France", "Senegal", "Iraq", "Norway"],
    "I": ["Argentina", "Algeria", "Austria", "Jordan"],
    "J": ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    "K": ["England", "Croatia", "Ghana", "Panama"],
    "L": ["Brazil", "Morocco", "Scotland", "Haiti"],
}

TEAM_TO_GROUP = {team: grp for grp, teams in GROUPS.items() for team in teams}

def group_of(a, b):
    return TEAM_TO_GROUP.get(a, "")

# ── Raw schedule (match_number, date, team_a, team_b, venue_key, local_time) ──
# Dates: 2026-06-XX  |  venue_key matches VENUES dict keys above
RAW = [
    # ── Group Stage ───────────────────────────────────────────────────────────
    (1,  "2026-06-11", "Mexico",      "South Africa", "Mexico City",     "14:00"),
    (2,  "2026-06-11", "South Korea", "Czechia",      "Guadalajara",     "20:00"),
    (3,  "2026-06-12", "Canada",      "Bosnia",       "Toronto",         "15:00"),
    (4,  "2026-06-12", "USA",         "Paraguay",     "Los Angeles",     "18:00"),
    (5,  "2026-06-13", "Qatar",       "Switzerland",  "Santa Clara",     "12:00"),
    (6,  "2026-06-13", "Brazil",      "Morocco",      "East Rutherford", "18:00"),
    (7,  "2026-06-13", "Haiti",       "Scotland",     "Boston",          "21:00"),
    (8,  "2026-06-13", "Australia",   "Turkey",       "Vancouver",       "18:00"),
    (9,  "2026-06-14", "Germany",     "Curacao",      "Houston",         "12:00"),
    (10, "2026-06-14", "Netherlands", "Japan",        "Arlington",       "15:00"),
    (11, "2026-06-14", "Ivory Coast", "Ecuador",      "Philadelphia",    "19:00"),
    (12, "2026-06-14", "Sweden",      "Tunisia",      "Monterrey",       "20:00"),
    (13, "2026-06-15", "Spain",       "Cape Verde",   "Atlanta",         "12:00"),
    (14, "2026-06-15", "Belgium",     "Egypt",        "Vancouver",       "12:00"),
    (15, "2026-06-15", "Saudi Arabia","Uruguay",      "Miami",           "18:00"),
    (16, "2026-06-15", "Iran",        "New Zealand",  "Los Angeles",     "18:00"),
    (17, "2026-06-16", "France",      "Senegal",      "East Rutherford", "15:00"),
    (18, "2026-06-16", "Iraq",        "Norway",       "Boston",          "18:00"),
    (19, "2026-06-16", "Argentina",   "Algeria",      "Kansas City",     "20:00"),
    (20, "2026-06-16", "Austria",     "Jordan",       "Santa Clara",     "21:00"),
    (21, "2026-06-17", "Portugal",    "DR Congo",     "Houston",         "12:00"),
    (22, "2026-06-17", "England",     "Croatia",      "Arlington",       "15:00"),
    (23, "2026-06-17", "Ghana",       "Panama",       "Toronto",         "19:00"),
    (24, "2026-06-17", "Uzbekistan",  "Colombia",     "Mexico City",     "20:00"),
    (25, "2026-06-18", "Czechia",     "South Africa", "Atlanta",         "12:00"),
    (26, "2026-06-18", "Switzerland", "Bosnia",       "Los Angeles",     "12:00"),
    (27, "2026-06-18", "Canada",      "Qatar",        "Vancouver",       "15:00"),
    (28, "2026-06-18", "Mexico",      "South Korea",  "Guadalajara",     "19:00"),
    (29, "2026-06-19", "Scotland",    "Morocco",      "Boston",          "18:00"),
    (30, "2026-06-19", "USA",         "Australia",    "Seattle",         "12:00"),
    (31, "2026-06-19", "Brazil",      "Haiti",        "Philadelphia",    "20:30"),
    (32, "2026-06-19", "Turkey",      "Paraguay",     "Santa Clara",     "21:00"),
    (33, "2026-06-20", "Netherlands", "Sweden",       "Houston",         "12:00"),
    (34, "2026-06-20", "Germany",     "Ivory Coast",  "Toronto",         "16:00"),
    (35, "2026-06-20", "Ecuador",     "Curacao",      "Kansas City",     "19:00"),
    (36, "2026-06-20", "Tunisia",     "Japan",        "Monterrey",       "22:00"),
    (37, "2026-06-21", "Spain",       "Saudi Arabia", "Atlanta",         "12:00"),
    (38, "2026-06-21", "Belgium",     "Iran",         "Los Angeles",     "12:00"),
    (39, "2026-06-21", "Uruguay",     "Cape Verde",   "Miami",           "18:00"),
    (40, "2026-06-21", "New Zealand", "Egypt",        "Vancouver",       "18:00"),
    (41, "2026-06-22", "Argentina",   "Austria",      "Arlington",       "12:00"),
    (42, "2026-06-22", "France",      "Iraq",         "Philadelphia",    "17:00"),
    (43, "2026-06-22", "Norway",      "Senegal",      "East Rutherford", "20:00"),
    (44, "2026-06-22", "Jordan",      "Algeria",      "Santa Clara",     "20:00"),
    (45, "2026-06-23", "Portugal",    "Uzbekistan",   "Houston",         "12:00"),
    (46, "2026-06-23", "England",     "Ghana",        "Boston",          "16:00"),
    (47, "2026-06-23", "Panama",      "Croatia",      "Toronto",         "19:00"),
    (48, "2026-06-23", "Colombia",    "DR Congo",     "Guadalajara",     "20:00"),
    (49, "2026-06-24", "Switzerland", "Canada",       "Vancouver",       "12:00"),
    (50, "2026-06-24", "Bosnia",      "Qatar",        "Seattle",         "12:00"),
    (51, "2026-06-24", "Scotland",    "Brazil",       "Miami",           "18:00"),
    (52, "2026-06-24", "Morocco",     "Haiti",        "Atlanta",         "18:00"),
    (53, "2026-06-24", "Czechia",     "Mexico",       "Mexico City",     "19:00"),
    (54, "2026-06-24", "South Africa","South Korea",  "Monterrey",       "19:00"),
    (55, "2026-06-25", "Ecuador",     "Germany",      "East Rutherford", "16:00"),
    (56, "2026-06-25", "Curacao",     "Ivory Coast",  "Philadelphia",    "16:00"),
    (57, "2026-06-25", "Japan",       "Sweden",       "Arlington",       "18:00"),
    (58, "2026-06-25", "Tunisia",     "Netherlands",  "Kansas City",     "18:00"),
    (59, "2026-06-25", "Turkey",      "USA",          "Los Angeles",     "19:00"),
    (60, "2026-06-25", "Paraguay",    "Australia",    "Santa Clara",     "19:00"),
    (61, "2026-06-26", "Norway",      "France",       "Boston",          "15:00"),
    (62, "2026-06-26", "Senegal",     "Iraq",         "Toronto",         "15:00"),
    (63, "2026-06-26", "Cape Verde",  "Saudi Arabia", "Houston",         "19:00"),
    (64, "2026-06-26", "Uruguay",     "Spain",        "Guadalajara",     "18:00"),
    (65, "2026-06-26", "Egypt",       "Iran",         "Seattle",         "20:00"),
    (66, "2026-06-26", "New Zealand", "Belgium",      "Vancouver",       "20:00"),
    (67, "2026-06-27", "Panama",      "England",      "East Rutherford", "17:00"),
    (68, "2026-06-27", "Croatia",     "Ghana",        "Philadelphia",    "17:00"),
    (69, "2026-06-27", "Colombia",    "Portugal",     "Miami",           "19:30"),
    (70, "2026-06-27", "DR Congo",    "Uzbekistan",   "Atlanta",         "19:30"),
    (71, "2026-06-27", "Algeria",     "Austria",      "Kansas City",     "21:00"),
    (72, "2026-06-27", "Jordan",      "Argentina",    "Arlington",       "21:00"),

    # ── Round of 32 ───────────────────────────────────────────────────────────
    (73, "2026-06-28", "TBD", "TBD", "Los Angeles",     "12:00"),
    (74, "2026-06-29", "TBD", "TBD", "Houston",         "12:00"),
    (75, "2026-06-29", "TBD", "TBD", "Boston",          "16:30"),
    (76, "2026-06-29", "TBD", "TBD", "Monterrey",       "19:00"),
    (77, "2026-06-30", "TBD", "TBD", "Arlington",       "12:00"),
    (78, "2026-06-30", "TBD", "TBD", "East Rutherford", "17:00"),
    (79, "2026-06-30", "TBD", "TBD", "Mexico City",     "19:00"),
    (80, "2026-07-01", "TBD", "TBD", "Atlanta",         "12:00"),
    (81, "2026-07-01", "TBD", "TBD", "Seattle",         "13:00"),
    (82, "2026-07-01", "TBD", "TBD", "Santa Clara",     "17:00"),
    (83, "2026-07-02", "TBD", "TBD", "Los Angeles",     "12:00"),
    (84, "2026-07-02", "TBD", "TBD", "Toronto",         "19:00"),
    (85, "2026-07-02", "TBD", "TBD", "Vancouver",       "20:00"),
    (86, "2026-07-03", "TBD", "TBD", "Arlington",       "13:00"),
    (87, "2026-07-03", "TBD", "TBD", "Miami",           "18:00"),
    (88, "2026-07-03", "TBD", "TBD", "Kansas City",     "20:30"),

    # ── Round of 16 ───────────────────────────────────────────────────────────
    (89, "2026-07-04", "TBD", "TBD", "Houston",         "12:00"),
    (90, "2026-07-04", "TBD", "TBD", "Philadelphia",    "17:00"),
    (91, "2026-07-05", "TBD", "TBD", "East Rutherford", "16:00"),
    (92, "2026-07-05", "TBD", "TBD", "Mexico City",     "18:00"),
    (93, "2026-07-06", "TBD", "TBD", "Arlington",       "14:00"),
    (94, "2026-07-06", "TBD", "TBD", "Seattle",         "17:00"),
    (95, "2026-07-07", "TBD", "TBD", "Atlanta",         "12:00"),
    (96, "2026-07-07", "TBD", "TBD", "Vancouver",       "13:00"),

    # ── Quarterfinals ─────────────────────────────────────────────────────────
    (97,  "2026-07-09", "TBD", "TBD", "Boston",          "16:00"),
    (98,  "2026-07-10", "TBD", "TBD", "Los Angeles",     "12:00"),
    (99,  "2026-07-11", "TBD", "TBD", "Miami",           "17:00"),
    (100, "2026-07-11", "TBD", "TBD", "Kansas City",     "20:00"),

    # ── Semifinals ────────────────────────────────────────────────────────────
    (101, "2026-07-14", "TBD", "TBD", "Arlington",       "14:00"),
    (102, "2026-07-15", "TBD", "TBD", "Atlanta",         "15:00"),

    # ── Bronze & Final ────────────────────────────────────────────────────────
    (103, "2026-07-18", "TBD", "TBD", "Miami",           "17:00"),
    (104, "2026-07-19", "TBD", "TBD", "East Rutherford", "15:00"),
]

STAGE_MAP = {
    range(1,  73): "Group Stage",
    range(73, 89): "Round of 32",
    range(89, 97): "Round of 16",
    range(97, 101): "Quarterfinal",
    range(101, 103): "Semifinal",
    range(103, 104): "Bronze Medal",
    range(104, 105): "Final",
}

def get_stage(n):
    for r, stage in STAGE_MAP.items():
        if n in r:
            return stage
    return "Unknown"

def get_status(date_str):
    if date_str < "2026-06-12":
        return "completed"
    if date_str == "2026-06-12":
        return "upcoming"   # today — update live via Atlas trigger
    return "upcoming"

ATMO = {
    "Group Stage": 78, "Round of 32": 82, "Round of 16": 87,
    "Quarterfinal": 91, "Semifinal": 95, "Bronze Medal": 88, "Final": 99,
}

matches = []
for num, date, ta, tb, venue_key, local_time in RAW:
    v = VENUES[venue_key]
    stage = get_stage(num)
    grp = group_of(ta, tb) if stage == "Group Stage" else ""
    matches.append({
        "match_id":        f"WC2026-{num:03d}",
        "match_number":    num,
        "stage":           stage,
        "group":           grp,
        "team_a":          ta,
        "team_b":          tb,
        "date":            date,
        "kickoff_local":   local_time,
        "stadium":         v["stadium"],
        "city":            v["city"],
        "country":         v["country"],
        "status":          get_status(date),
        "atmosphere_score": ATMO.get(stage, 80),
        "winner":          None,
    })

out = Path(__file__).parent / "matches_seed.json"
out.write_text(json.dumps(matches, indent=2, ensure_ascii=False))
print(f"✅ Written {len(matches)} matches to {out}")
