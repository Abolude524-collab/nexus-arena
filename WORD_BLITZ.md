# NEXUS ARENA — WORD BLITZ

## Game Design & Implementation Specification

**Game Type:** Real-Time Multiplayer Quiz / Typing Competition  
**Players:** 2–8  
**Match Duration:** 3–5 minutes  
**Primary Learning Focus:** Synchronized timers, deterministic rounds, server validation, concurrent submissions

---

# 1. Game Overview

Word Blitz is a real-time multiplayer word competition.

All players receive the same challenge.

Players must type the correct answer as quickly as possible.

The server determines:

- the challenge
- when the round starts
- when the round ends
- whether an answer is correct
- submission order
- scores

---

# 2. Why This Game Exists

Word Blitz introduces a different multiplayer problem:

> **Everyone is participating in the same timed state machine.**

This teaches:

- synchronized timers
- server time
- concurrent submissions
- deterministic state transitions
- answer validation
- race conditions
- stale submissions

---

# 3. Game Modes

Initial mode:

### Type the Word

Players receive:

```text
TYPE THIS:

NEON
```

They type:

```text
NEON
```

and submit.

---

# 4. Future Modes

### Unscramble

```text
NOEN

Answer:
NEON
```

### Missing Letters

```text
N _ O N
```

### Speed Typing

Players type longer sentences.

### Definition Mode

```text
A place where players compete.

Answer:
ARENA
```

---

# 5. Match Configuration

Default:

```text
Players: 2–8
Rounds: 10
Round duration: 10 seconds
Intermission: 2 seconds
```

---

# 6. Round Lifecycle

```text
WAITING
   ↓
COUNTDOWN
   ↓
ROUND_ACTIVE
   ↓
ANSWER_SUBMITTED
   ↓
ROUND_END
   ↓
NEXT_ROUND
```

---

# 7. Server-Controlled Timer

The server owns the timer.

Do not rely on:

```js
setTimeout()
```

inside each client as the source of truth.

The server sends:

```ts
{
  roundId,
  startedAt,
  endsAt
}
```

Clients calculate the visual countdown from server timestamps.

---

# 8. Challenge Model

```ts
type WordChallenge = {
  id: string;
  prompt: string;
  answer: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
};
```

Never send the raw answer to the client before submission.

The client receives the prompt.

The server retains the correct answer.

---

# 9. Answer Submission

Client sends:

```ts
socket.emit("word:submit", {
  roundId,
  answer,
});
```

The server:

1. validates player
2. validates round
3. checks time
4. normalizes answer
5. compares answer
6. calculates reaction time
7. calculates score
8. records submission

---

# 10. Answer Normalization

Depending on the mode:

```text
trim whitespace
case-insensitive comparison
```

Example:

```text
"  NeOn "
```

becomes:

```text
"neon"
```

before comparison.

---

# 11. Scoring

Base correct answer:

```text
+100
```

Speed bonus:

```text
< 1 sec       +100
1–2 sec        +75
2–4 sec        +50
4–7 sec        +25
7–10 sec        +10
```

Incorrect:

```text
0
```

Optional penalty:

```text
-10
```

---

# 12. First Correct Answer

The first correct answer can receive a bonus:

```text
FIRST CORRECT
+50
```

But the server determines who submitted first.

Never trust client timestamps.

---

# 13. Socket Events

### Client → Server

```text
word:ready
word:submit
word:leave
```

### Server → Client

```text
word:countdown
word:round_start
word:submission_result
word:score_update
word:round_end
word:next_round
word:game_end
```

---

# 14. UI

Main game:

```text
ROUND 4 / 10

TIME
00:07

TYPE THIS:

┌──────────────────────────────┐
│                              │
│          NEXUS               │
│                              │
└──────────────────────────────┘

[______________________________]

[ SUBMIT ]
```

Leaderboard:

```text
1  EnochDDev       420
2  Jeffrey         390
3  Sarah           350
```

---

# 15. Submission Feedback

Immediately show:

Correct:

```text
✓ CORRECT
+150
1420ms
```

Incorrect:

```text
✕ INCORRECT
Try again.
```

Expired:

```text
TIME'S UP
```

Do not reveal the correct answer before the round ends.

---

# 16. Anti-Cheat

The client must not receive:

- answer
- future challenges
- server scoring rules that aren't necessary

The server validates the answer.

Prevent:

- submissions after deadline
- submissions for old rounds
- duplicate scoring
- unauthorized submissions

---

# 17. Challenge Selection

For MVP:

Use a server-side challenge pool.

Example:

```text
challenges/
    easy.json
    medium.json
    hard.json
```

Select randomly.

Future version:

Store challenges in PostgreSQL.

---

# 18. Implementation Architecture

```text
games/word-blitz/

├── WordBlitz.ts
├── RoundManager.ts
├── ChallengeManager.ts
├── ScoringSystem.ts
├── AnswerValidator.ts
├── validation.ts
└── types.ts
```

---

# 19. Deterministic Round State

The game should have an explicit state machine.

```ts
type RoundState =
  | "COUNTDOWN"
  | "ACTIVE"
  | "ENDED";
```

Do not allow arbitrary transitions.

Example:

```text
COUNTDOWN
   ↓
ACTIVE
   ↓
ENDED
```

Never:

```text
ENDED → ACTIVE
```

unless starting a new round.

---

# 20. Testing

Test:

- challenge selection
- timer boundaries
- correct answers
- incorrect answers
- duplicate submissions
- stale round submissions
- first-answer bonus
- simultaneous submissions
- disconnected players

Critical test:

```text
Two players submit the correct answer
at nearly the same time.

Server deterministically orders
the submissions and awards
the first-answer bonus exactly once.
```

---

# 21. Advanced Version

### Typing Race

Players type longer paragraphs.

### Team Mode

Two teams compete.

### Vocabulary Mode

Difficulty increases each round.

### Streak Mode

Consecutive correct answers increase multiplier.

### Custom Rooms

Host chooses:

- difficulty
- rounds
- time per round
- scoring rules

---

# 22. Engineering Lessons

Word Blitz teaches:

- synchronized server clocks
- state machines
- timed events
- concurrent submissions
- server-side validation
- deterministic scoring
- race-condition handling
- real-time UI synchronization