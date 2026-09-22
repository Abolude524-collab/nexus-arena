# NEXUS ARENA — REACTION RUSH

## Game Design & Implementation Specification

**Game Type:** Real-Time Reaction Competition  
**Players:** 2–8  
**Match Duration:** 60–90 seconds  
**Primary Learning Focus:** Event ordering, latency, timestamps, race conditions, server authority

---

# 1. Game Overview

Reaction Rush is a fast-paced multiplayer reaction game.

Players wait for a visual target to appear in the arena.

When the target appears, every player must click/tap it as quickly as possible.

The fastest valid player earns the most points.

The game consists of multiple rounds.

Each round introduces a new target at a random time and location.

The server determines:

- when the target becomes active
- whether a click is valid
- who clicked first
- how many points each player receives
- when the round ends

The client only provides input.

---

# 2. Why This Game Exists

Reaction Rush should teach a different multiplayer problem from Neon Dash.

Neon Dash focuses primarily on:

> Continuous state synchronization.

Reaction Rush focuses on:

> **Competing events arriving at different times.**

This introduces:

- network latency
- event ordering
- timestamps
- race conditions
- server authority
- simultaneous actions
- invalid/stale events

---

# 3. Core Gameplay

A match contains multiple rounds.

Example:

```text
ROUND 01

WAIT...

        ●

GO!

Player A clicks
Player B clicks
Player C clicks

RESULT:

🥇 Player A       100 pts
🥈 Player C        75 pts
🥉 Player B        50 pts
```

Then the next round begins.

---

# 4. Match Configuration

Default:

```text
Players:       2–8
Rounds:        10
Round timeout: 5 seconds
Intermission:  2 seconds
```

---

# 5. Round Lifecycle

```text
WAITING
   ↓
COUNTDOWN
   ↓
ARMED
   ↓
TARGET ACTIVE
   ↓
FIRST VALID CLICK
   ↓
ROUND RESULT
   ↓
INTERMISSION
   ↓
NEXT ROUND
```

---

# 6. Server Authority

The server controls the complete round.

The server determines:

```text
targetId
targetPosition
targetActivatedAt
roundId
roundDeadline
```

The client must never decide:

> "I clicked first."

Instead:

```text
Client
  ↓
target:click
  ↓
Server
  ↓
validate
  ↓
timestamp
  ↓
determine winner
```

---

# 7. Target

A target contains:

```ts
type ReactionTarget = {
  id: string;
  x: number;
  y: number;
  radius: number;
  activatedAt: number;
  expiresAt: number;
};
```

The target ID prevents stale clicks from previous rounds.

---

# 8. Client Input

When a player clicks:

```ts
socket.emit("reaction:click", {
  roundId,
  targetId,
});
```

Do NOT send:

```ts
score
reactionTime
winner
```

The server calculates these.

---

# 9. Server Validation

The server checks:

1. Is the player in the match?
2. Is the round active?
3. Is the round ID correct?
4. Does the target exist?
5. Has the target already been claimed?
6. Has the round expired?

Invalid requests are rejected.

---

# 10. Reaction Time

Server records:

```text
clickTimestamp - targetActivatedAt
```

Example:

```text
Target activated:
12:00:10.000

Player click:
12:00:10.142

Reaction:
142ms
```

The server uses this value for scoring.

---

# 11. Scoring

Suggested scoring:

| Reaction | Points |
|---|---:|
| < 150ms | 100 |
| 150–250ms | 80 |
| 250–400ms | 60 |
| 400–600ms | 40 |
| > 600ms | 20 |

The first valid click receives a bonus.

Example:

```text
FIRST HIT
+50
```

---

# 12. Anti-Cheat

The client cannot submit:

```text
"I reacted in 50ms."
```

It can only submit:

```text
"I clicked target X."
```

The server determines the actual timing.

Also reject:

- clicks before target activation
- clicks after timeout
- duplicate clicks
- clicks for old rounds
- clicks from spectators/non-players

---

# 13. Socket Events

### Client → Server

```text
reaction:ready
reaction:click
reaction:leave
```

### Server → Client

```text
reaction:countdown
reaction:target
reaction:round_result
reaction:score_update
reaction:next_round
reaction:game_end
```

---

# 14. UI

Main arena:

```text
┌─────────────────────────────────────┐
│ ROUND 4/10              SCORE 420   │
│                                     │
│                                     │
│                 ●                   │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

When the target appears, it should be visually obvious.

Do not rely entirely on color.

Use:

- shape
- animation
- position
- subtle sound if enabled

---

# 15. Results

After every round:

```text
ROUND COMPLETE

🥇 EnochDDev
142ms
+150

Jeffrey
189ms
+80

Sarah
302ms
+60
```

---

# 16. Implementation Architecture

Create:

```text
games/reaction-rush/

├── ReactionRush.ts
├── ReactionRound.ts
├── ReactionTarget.ts
├── scoring.ts
├── validation.ts
└── types.ts
```

The game must implement the common `GameMode` interface.

---

# 17. Testing

Test:

- target generation
- round lifecycle
- valid clicks
- duplicate clicks
- expired clicks
- stale target clicks
- scoring
- simultaneous clicks
- disconnected player

Critical test:

```text
Player A and Player B submit clicks
within the same server tick.

Server chooses the first valid event
according to authoritative server ordering.
```

---

# 18. Advanced Version

Later introduce:

### Reaction streaks

Consecutive fast reactions increase multiplier.

### Fake targets

Occasionally display decoys.

### Moving targets

Target moves after activation.

### Team mode

Two teams compete on aggregate reaction speed.

### Tournament mode

Players are eliminated across rounds.

---

# 19. Engineering Lessons

Reaction Rush teaches:

- event ordering
- race conditions
- server timestamps
- latency
- event validation
- deterministic scoring
- stale event rejection
- multiplayer competition