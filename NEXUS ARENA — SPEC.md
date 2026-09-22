# NEXUS ARENA
## Technical Specification

---

# 1. Architecture

Use a TypeScript monorepo.

```text
nexus-arena/
├── apps/
│   ├── web/
│   └── server/
├── packages/
│   └── shared/
├── prisma/
├── tests/
├── docs/
└── .github/
```

Frontend:

```text
React
Vite
TypeScript
Tailwind
Zustand
Socket.IO Client
Canvas API
```

Backend:

```text
Node.js
Express
TypeScript
Socket.IO
Prisma
PostgreSQL
Zod
JWT
```

---

# 2. Separation of Responsibilities

## React

Responsible for:

- routing
- UI
- forms
- authentication UI
- lobby
- room UI
- chat UI
- scoreboard UI

## Canvas

Responsible for:

- rendering game world
- players
- collectibles
- obstacles
- effects

## Socket.IO

Responsible for:

- real-time events
- player connections
- room membership
- game synchronization
- chat

## Server

Responsible for:

- authentication
- authorization
- game state
- game rules
- scoring
- collisions
- match lifecycle

## PostgreSQL

Responsible for persistent data.

---

# 3. Server Game Loop

Target:

```text
60 updates/second
```

However, do not broadcast the complete game state blindly 60 times per second if unnecessary.

Separate:

### Simulation tick

High frequency.

### Network snapshot

Controlled frequency.

### Persistent database writes

Low frequency.

---

# 4. Input Model

Client sends:

```ts
type PlayerInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sequence: number;
};
```

The server validates the input.

The sequence number helps detect stale/out-of-order inputs.

---

# 5. Player State

```ts
type PlayerState = {
  id: string;
  username: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  score: number;
  activePowerUps: string[];
  connected: boolean;
};
```

---

# 6. Game State

```ts
type GameState = {
  roomId: string;
  status: "COUNTDOWN" | "PLAYING" | "FINISHED";
  startedAt: number;
  endsAt: number;
  players: PlayerState[];
  collectibles: Collectible[];
};
```

---

# 7. Collectible

```ts
type Collectible = {
  id: string;
  type: "ENERGY" | "GOLDEN" | "POWER_CORE";
  x: number;
  y: number;
  value: number;
};
```

---

# 8. Socket Events

## Client → Server

```text
room:create
room:join
room:leave
room:ready

game:start
game:input

chat:send
```

## Server → Client

```text
room:created
room:updated
room:player_joined
room:player_left

game:countdown
game:state
game:player_joined
game:player_left
game:score_updated
game:ended

chat:message

system:error
```

---

# 9. Socket Authentication

Socket handshake must contain authentication credentials.

Server:

```text
socket connection
        ↓
verify JWT
        ↓
resolve user
        ↓
attach user to socket
        ↓
allow connection
```

Unauthenticated sockets are rejected.

---

# 10. Room Manager

Create a dedicated service:

```text
RoomManager
```

Responsibilities:

- create room
- destroy room
- join room
- leave room
- get room
- list rooms
- manage host
- enforce capacity

Do not put all room logic inside Socket.IO handlers.

---

# 11. Game Manager

Create:

```text
GameManager
```

Responsibilities:

- create game
- start game
- process input
- update game
- detect collisions
- calculate score
- end game
- cleanup game

---

# 12. Game Engine

Create a game abstraction.

```ts
interface GameMode {
  initialize(): void;
  update(delta: number): void;
  handleInput(input: PlayerInput): void;
  getState(): GameState;
  isFinished(): boolean;
  getResults(): MatchResult;
}
```

This allows future games.

Example:

```text
GameMode
   │
   ├── NeonDash
   ├── ReactionRush
   ├── Territory
   └── WordBlitz
```

---

# 13. Database Models

Core entities:

```text
User
Room
Match
MatchParticipant
Message
PlayerStats
```

### User

```text
id
username
email
passwordHash
avatar
createdAt
updatedAt
```

### Room

```text
id
code
name
hostId
gameType
status
maxPlayers
createdAt
```

### Match

```text
id
roomId
gameType
startedAt
endedAt
winnerId
```

### MatchParticipant

```text
id
matchId
userId
score
rank
```

### Message

```text
id
roomId
userId
content
createdAt
```

### PlayerStats

```text
userId
gamesPlayed
wins
totalScore
xp
```

---

# 14. Database Strategy

Do not persist every game tick.

During gameplay:

```text
Memory
   ↓
Game State
```

At match completion:

```text
Game State
   ↓
Match Result
   ↓
PostgreSQL
```

Use database transactions when updating related statistics.

---

# 15. Collision Detection

For MVP use simple circle/rectangle collision.

Example conceptual rule:

```text
distance(player, collectible)
        <
playerRadius + collectibleRadius
```

When collision occurs:

1. Server confirms collision.
2. Remove collectible.
3. Update score.
4. Generate replacement collectible if required.
5. Broadcast state change.

---

# 16. Client Rendering Loop

Canvas uses:

```text
requestAnimationFrame()
```

The renderer should not directly mutate React state every frame.

Use a dedicated game-state reference/store.

React handles surrounding application UI.

---

# 17. Client Prediction

MVP may initially use server snapshots without sophisticated prediction.

After the basic multiplayer system is stable, consider:

- client-side prediction
- reconciliation
- interpolation

Do not introduce these until the basic authoritative model works.

---

# 18. Reconnection

Track:

```text
userId
roomId
socketId
connection status
```

On reconnect:

1. authenticate
2. identify previous room
3. restore membership
4. send latest state
5. resume gameplay

---

# 19. Rate Limiting

Protect:

- login
- registration
- room creation
- chat
- socket events

Chat should have a per-user message cooldown.

---

# 20. Validation

Use Zod for external input.

Every request/event crossing the client-server boundary must be validated.

Example:

```text
Client
 ↓
Socket event
 ↓
Zod validation
 ↓
Authorization
 ↓
Business logic
```

---

# 21. Testing Strategy

### Unit

Game engine.

### Integration

Socket event flows.

### E2E

Two-player browser scenario.

Critical E2E:

```text
Browser A
Browser B

A creates room
B joins

A starts game

A moves
B receives movement

B collects item
Both receive score update

Timer expires

Both receive identical results
```

---

# 22. Logging

Use structured server logs.

Log:

- connections
- disconnections
- room lifecycle
- game lifecycle
- errors
- security events

Do not log:

- passwords
- JWT secrets
- sensitive tokens

---

# 23. Environment Variables

Example:

```text
DATABASE_URL=
JWT_SECRET=
CLIENT_URL=
PORT=
NODE_ENV=
```

Never commit `.env`.

Provide:

```text
.env.example
```

---

# 24. Deployment

Frontend:

Vercel

Backend:

Render / Railway / similar WebSocket-capable host

Database:

PostgreSQL provider

Important:

Verify production infrastructure supports persistent WebSocket connections.

---

# 25. Engineering Standards

Required:

- strict TypeScript
- ESLint
- Prettier
- clean architecture
- reusable services
- centralized error handling
- environment validation
- typed Socket.IO events
- tests for critical logic
- no hardcoded secrets
- no duplicated business logic
- no giant components
- no giant Socket.IO handlers

---

# 26. Definition of Done

A feature is not complete merely because it works locally.

Each feature must have:

```text
Implementation
↓
Validation
↓
Error handling
↓
Tests
↓
Documentation
↓
Manual verification
```

---

# 27. Future Scalability

The initial server can use in-memory game state.

For future horizontal scaling:

```text
Load Balancer
      ↓
Multiple Game Servers
      ↓
Redis Adapter
      ↓
Socket.IO
```

Do not prematurely implement this complexity in MVP.