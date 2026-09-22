# NEXUS ARENA — Technical Architecture Document

## 1. System Overview

NEXUS ARENA is designed as a modular TypeScript monorepo operating on a single-server authoritative real-time model.

```text
[ React 18 Web App ] <---> [ Socket.IO WebSocket ] <---> [ Express + Socket Server ]
         │                                                      │
   Canvas Renderer                                       GameManager (60 FPS)
         │                                                      │
   requestAnimationFrame                                NeonDash Engine
                                                                │
                                                         Prisma ORM + DB
```

---

## 2. Multiplayer State Flow

1. **Client Input**: The client intercepts `keydown`/`keyup` (`WASD` & Arrow keys) and dispatches sequence-tracked `game:input` payloads over Socket.IO.
2. **Server Simulation**: The `GameManager` ticks `NeonDash` at 60 FPS (`1000/60`ms). It applies velocity, clamps positions within arena bounds, resolves obstacle collisions, and checks circle-to-circle orb pickup.
3. **State Snapshot**: Every tick, `GameManager` broadcasts `game:state` snapshots to all clients in the room.
4. **Canvas Rendering**: The client Canvas engine renders the server state at 60 FPS using `requestAnimationFrame`.

---

## 3. Database Persistence Strategy

Game ticks remain strictly in memory during gameplay. On match completion, `GameManager` calls `MatchService`, which executes a single Prisma transaction:
1. Inserts `Match` record.
2. Inserts `MatchParticipant` records.
3. Upserts cumulative `PlayerStats` (wins, gamesPlayed, totalScore, xp).
