# NEXUS ARENA — TERRITORY

## Game Design & Implementation Specification

**Game Type:** Real-Time Territory Control  
**Players:** 2–8  
**Match Duration:** 5 minutes  
**Primary Learning Focus:** Shared state, contention, ownership, spatial logic, synchronization

---

# 1. Game Overview

Territory is a top-down multiplayer control game.

The arena is divided into a grid of territories.

Players move around the map and attempt to capture territories.

A player earns points for controlling territory.

Players can contest territories controlled by opponents.

The player with the highest territory score when the timer ends wins.

---

# 2. Why This Game Exists

Neon Dash teaches:

> Continuous movement synchronization.

Reaction Rush teaches:

> Competitive event ordering.

Territory teaches:

> **Shared state and conflicting ownership.**

Multiple players are constantly attempting to modify the same world state.

For example:

```text
Player A owns territory 17.

Player B enters territory 17.

Territory becomes contested.

Player A leaves.

Player B captures territory 17.
```

This is a much more interesting state-management problem.

---

# 3. Arena

Example:

```text
┌────┬────┬────┬────┬────┐
│ A  │ A  │    │ B  │ B  │
├────┼────┼────┼────┼────┤
│ A  │    │    │    │ B  │
├────┼────┼────┼────┼────┤
│    │    │ C  │    │    │
├────┼────┼────┼────┼────┤
│ D  │    │    │    │    │
├────┼────┼────┼────┼────┤
│ D  │ D  │    │    │    │
└────┴────┴────┴────┴────┘
```

Each cell has an owner:

```text
NEUTRAL
PLAYER
TEAM
CONTESTED
```

---

# 4. Game Objective

Control the largest amount of territory.

Players earn passive points while controlling territory.

Additional points are awarded for:

- capturing
- defending
- taking contested territory

---

# 5. Match Configuration

Default:

```text
Players:       2–8
Map:           10 × 10
Duration:      5 minutes
Capture time:  3 seconds
```

---

# 6. Territory States

Each territory can be:

```text
NEUTRAL
CONTROLLED
CONTESTED
CAPTURING
```

Example:

```text
Player A enters neutral zone.

NEUTRAL
   ↓
CAPTURING
   ↓
CONTROLLED BY A
```

If B enters:

```text
CONTROLLED BY A
        ↓
    CONTESTED
        ↓
A leaves
        ↓
CONTROLLED BY B
```

---

# 7. Capture Mechanics

A player must remain within a territory for a certain amount of time.

Example:

```text
Capture progress:

████████████░░░░
75%
```

If an opponent enters:

```text
Player A: 70%
Player B: 30%

ZONE CONTESTED
```

Capture progress can freeze while contested.

---

# 8. Server Authority

The server determines:

- player positions
- territory occupancy
- ownership
- capture progress
- scores
- game timer

Clients send movement input.

They do not send:

```text
"I captured territory 12."
```

They send movement.

The server calculates the result.

---

# 9. Territory Model

```ts
type Territory = {
  id: string;
  gridX: number;
  gridY: number;
  ownerId: string | null;
  state: "NEUTRAL" | "CONTROLLED" | "CONTESTED" | "CAPTURING";
  captureProgress: number;
  capturingPlayers: string[];
};
```

---

# 10. Player State

Extend the shared player model:

```ts
type TerritoryPlayer = {
  playerId: string;
  x: number;
  y: number;
  score: number;
  territoriesControlled: number;
};
```

---

# 11. Scoring

Example:

| Action | Points |
|---|---:|
| Capture | +100 |
| Defend for 10s | +25 |
| Control territory | +10/sec |
| Full-map control | +500 |

Server calculates all scores.

---

# 12. Power-Ups

Optional MVP+ feature:

### Speed Boost

Move faster.

### Capture Boost

Capture territory faster.

### Shield

Prevent territory ownership from being changed for a short time.

---

# 13. Socket Events

### Client → Server

```text
territory:input
territory:ready
territory:leave
```

### Server → Client

```text
territory:state
territory:captured
territory:contested
territory:score
territory:game_end
```

---

# 14. Network Optimization

Territory is a good opportunity to introduce **delta state updates**.

Do not necessarily send the entire map every time.

Instead:

```text
territory:update

{
  territoryId: "12",
  ownerId: "player-7",
  state: "CONTROLLED"
}
```

The client updates only the changed territory.

This becomes important