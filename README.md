<div align="center">

```
🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟩
🟩⬜🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜🟩
🟩⬜🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜🟩🟩🟩⚽🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜🟩
🟩⬜🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜🟩
🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜🟩
🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
```

# ⚽ GOLAZO
### *Your AI-powered companion for the 2026 FIFA World Cup™*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://mongodb.com/atlas)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-blue?logo=google)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange?logo=firebase)](https://firebase.google.com)

*Your AI companion for the 2026 FIFA World Cup — USA 🇺🇸 · Canada 🇨🇦 · Mexico 🇲🇽*

</div>

---

## 🏟️ What is Golazo?

**Golazo** is a fan-first AI agent for the 2026 FIFA World Cup — hosted across the USA 🇺🇸, Canada 🇨🇦, and Mexico 🇲🇽. Whether you're flying in for the opener in Mexico City or catching a final in New Jersey, Golazo has your back.

> *"Golazo"* — Spanish for a **spectacular goal**. That's what we're here to celebrate. 🥅✨

Chat with the agent, explore predicted lineups, plan your trip, and get crowd vibes for every stadium — all in one place.

---

## ✨ Features

| 🤖 | Feature | Description |
|----|---------|-------------|
| 💬 | **AI Chat Agent** | Powered by Gemini 2.0 Flash — ask anything about matches, players, cities, travel |
| 🗺️ | **Trip Planner** | Hotels, flights, estimated costs — personalised to your matches |
| 🏟️ | **Stadium Vibes** | Crowd insights & atmosphere scores per city |
| 👕 | **Player Lineups** | Predicted XIs with jersey numbers on an interactive pitch |
| 🧠 | **Smart Memory** | Agent remembers your preferences across sessions |
| 📋 | **Fantasy Roster** | Build and manage your World Cup fantasy squad |
| 🔔 | **Match Alerts** | Proactive notifications when match results land (Atlas Triggers) |
| ✅ | **Action Approvals** | Review and approve AI-suggested bookings before anything is confirmed |

---

## 🌍 16 Stadiums · 104 Matches · 48 Teams

```
🇺🇸 USA              🇨🇦 Canada           🇲🇽 Mexico
──────────────────   ──────────────────   ──────────────────
📍 New York/NJ       📍 Toronto           📍 Mexico City
📍 Los Angeles       📍 Vancouver         📍 Guadalajara
📍 Dallas            📍 Edmonton          📍 Monterrey
📍 San Francisco
📍 Seattle
📍 Boston
📍 Miami
📍 Kansas City
📍 Atlanta
📍 Philadelphia
📍 Houston
```

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                    F R O N T E N D                  │
│         Next.js 14  ·  Tailwind CSS  ·  TypeScript  │
│              Firebase Hosting (static)              │
└───────────────────────┬─────────────────────────────┘
                        │  SSE  /  REST
┌───────────────────────▼─────────────────────────────┐
│                     B A C K E N D                   │
│             FastAPI (Python 3.11)                   │
│              Google ADK · Gemini 2.0 Flash          │
│                 Railway (Cloud Run)                 │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                    D A T A B A S E                  │
│         MongoDB Atlas M0  ·  8 Collections          │
│   Vector Search · Atlas Search · Database Triggers  │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB Atlas account (free M0 tier)
- Google AI API key

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# → http://localhost:3000
```

### Seed the database

```bash
python backend/data/seed_matches.py
python backend/data/seed_venues.py
python backend/data/seed_players.py
python backend/data/create_indexes.py
```

---

## 📡 API Highlights

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat` | 🤖 SSE stream — AI agent conversation |
| `GET`  | `/matches` | 📅 List matches with filters |
| `GET`  | `/lineup/{match_id}` | 👕 Predicted XI for a match |
| `GET`  | `/crowd?city=` | 🏟️ Crowd insights by city |
| `GET`  | `/trip?fan_id=` | ✈️ Fan trip summary |
| `POST` | `/webhook/match-finished` | 🔔 Atlas trigger webhook |
| `GET`  | `/health` | ✅ Health check |

---

## 🗄️ Data Model

```
fans              → fan profiles & preferences
trips             → itineraries per fan
matches           → 104 WC2026 fixtures
venues            → 16 stadiums + vibe embeddings
players           → 720 players across 48 teams
fantasy_rosters   → fan fantasy squads
agent_memory      → per-fan conversation memory (vector)
pending_actions   → approval queue for AI suggestions
```

---

## 👥 Contributors

Built with ❤️ by two football fans, fueled by passion for the beautiful game and way too much coffee ☕

| | Name | GitHub |
|---|------|--------|
| ⚽ | **SahilSingh Khalsa** | [@Sahil-Khalsa](https://github.com/Sahil-Khalsa) |
| ⚽ | **Nesh Rochwani** | [@nr1306](https://github.com/nr1306) |

---

<div align="center">

```
         ⚽ · · · · · · · · · · · · · · · · · ⚽
        🥅                                   🥅
         ⚽ · · · · · · G O L A Z O · · · · ⚽
        🥅                                   🥅
         ⚽ · · · · · · · · · · · · · · · · · ⚽
```

*Made for fans, by fans. See you at the World Cup! 🏆🇺🇸🇨🇦🇲🇽*

</div>
