# NEXUS ARENA
## UI & Design System

---

# 1. Design Direction

NEXUS ARENA should feel like:

> **Premium esports interface × futuristic developer product × multiplayer arcade.**

Avoid:

- generic gaming templates
- excessive gradients
- childish game UI
- overcrowded dashboards
- excessive glassmorphism
- random neon colors

The interface should be sharp, controlled, technical, and cinematic.

---

# 2. Visual Identity

### Brand

**NEXUS ARENA**

Optional signature:

**POWERED BY EnochDDev**

### Tone

- competitive
- futuristic
- technical
- energetic
- premium

---

# 3. Typography

Use a distinctive display font for headings and a highly readable sans-serif for body content.

Suggested:

### Headings

Space Grotesk

### Body

Inter

### Technical / stats

JetBrains Mono

Use typography intentionally.

Large headings should create visual hierarchy.

---

# 4. Color System

Primary background:

```text
#08090D
```

Secondary:

```text
#10121A
```

Panels:

```text
#151821
```

Primary text:

```text
#F5F7FA
```

Secondary text:

```text
#969DAA
```

Accent:

```text
#8B5CF6
```

Secondary accent:

```text
#22D3EE
```

Success:

```text
#22C55E
```

Warning:

```text
#F59E0B
```

Danger:

```text
#EF4444
```

Do not use every accent simultaneously.

Accent colors should communicate state.

---

# 5. Spacing

Use an 8px spacing system.

```text
4
8
12
16
24
32
48
64
96
128
```

---

# 6. Border Radius

Use restrained rounding.

Buttons:

12px

Cards:

16px

Modals:

20px

Game elements:

varies by object

Avoid making every element a pill.

---

# 7. Landing Page

## Hero

Full viewport.

Left:

```text
REAL-TIME
MULTIPLAYER

ENTER
THE ARENA.
```

Supporting text underneath.

Right:

Interactive animated miniature game arena.

CTA buttons:

```text
[ PLAY NOW ]
[ VIEW GITHUB ]
```

---

# 8. Navigation

Desktop:

```text
NEXUS

PLAY
LEADERBOARD
ABOUT

[ LOGIN ]
```

Authenticated:

```text
NEXUS

PLAY
LEADERBOARD
HISTORY

◉ ENOCHDDEV
```

---

# 9. Lobby UI

Top:

```text
NEXUS ARENA
ONLINE 1,284
```

Main content:

```text
ROOMS

[ SEARCH ROOMS... ]       [ CREATE ROOM ]

------------------------------------------------

ROOM NAME       GAME       PLAYERS       STATUS

Neon Titans     Neon Dash  6/8           WAITING
Code Warriors   Neon Dash  3/8           WAITING
```

Room rows should have strong hover states.

---

# 10. Create Room Modal

Fields:

```text
ROOM NAME
[________________]

GAME
[ Neon Dash ▼ ]

MAX PLAYERS
[ 8 ]

PRIVATE ROOM
[ OFF ]

PASSWORD
[________________]

[ CREATE ROOM ]
```

Keep the modal focused.

---

# 11. Waiting Room

Header:

```text
NEON DASH
ROOM 7F42-X9
```

Player grid:

```text
┌────────┐ ┌────────┐ ┌────────┐
│ AVATAR │ │ AVATAR │ │ AVATAR │
│ Enoch  │ │ Jeffrey│ │ Sarah  │
│ READY  │ │ READY  │ │ READY  │
└────────┘ └────────┘ └────────┘
```

Chat occupies the right side.

Host gets:

```text
[ START GAME ]
```

---

# 12. Game Interface

The game should maximize Canvas space.

Top HUD:

```text
SCORE  840

TIME
02:14

PLAYERS
6/8
```

Side scoreboard:

```text
1  Enoch       840
2  Jeffrey     710
3  Sarah       620
4  Daniel      510
```

Bottom:

```text
WASD MOVE
```

Chat can collapse into a floating panel.

---

# 13. Canvas

The arena should have:

- dark background
- subtle grid
- bounded play area
- obstacles
- collectibles
- player indicators
- player names
- lightweight particle effects

Avoid visual effects that interfere with gameplay.

---

# 14. Player Visual

Each player should have:

- distinct color
- circular/rounded avatar body
- directional indicator
- username
- subtle selection ring

Local player:

```text
username
   ↓
  ◉
 ╱│╲
```

Other players should be visually distinguishable.

---

# 15. Countdown

Before match:

```text
3

2

1

GO!
```

Use a large centered animation.

---

# 16. Match Results

Full-screen overlay:

```text
GAME OVER

YOU FINISHED

#1

2,840 POINTS

+250 XP

──────────────────

FINAL STANDINGS

01  EnochDDev       2840
02  Jeffrey         2510
03  Sarah           1940

[ PLAY AGAIN ]
[ EXIT TO LOBBY ]
```

---

# 17. Leaderboard

Use a strong ranking layout.

Top three players get larger cards.

Everyone else gets compact rows.

Include:

- rank
- avatar
- username
- wins
- score

---

# 18. Profile

Profile header:

```text
[ AVATAR ]

ENOCHDDEV
Level 14

8,420 XP

27 WINS
61 GAMES
76,200 SCORE
```

Tabs:

```text
OVERVIEW
MATCHES
ACHIEVEMENTS
```

---

# 19. Chat

Chat should feel integrated into the game.

Messages:

```text
ENOCH
Let's go!

JEFFREY
ready 🔥
```

Input:

```text
Message...                       [SEND]
```

Show system events differently:

```text
SYSTEM
Sarah joined the room.
```

---

# 20. Admin Dashboard

Use a more data-dense interface.

Top metrics:

```text
ONLINE
1,284

ROOMS
218

MATCHES
147

CONNECTIONS
1,942
```

Charts:

- active users
- matches over time
- server connections
- messages

Tables:

- users
- rooms
- matches

---

# 21. Loading States

Use skeletons rather than blank screens.

For real-time connection:

```text
CONNECTING...
```

If disconnected:

```text
⚠ CONNECTION LOST

Trying to reconnect...
```

When recovered:

```text
✓ CONNECTION RESTORED
```

---

# 22. Empty States

Example:

```text
NO ACTIVE ROOMS

Be the first player to create one.

[ CREATE ROOM ]
```

---

# 23. Error States

Errors must explain what happened and what the user can do.

Bad:

> Something went wrong.

Good:

> This room is already full.

```text
[ RETURN TO LOBBY ]
```

---

# 24. Motion

Animations should be purposeful.

Use:

- page transitions
- room join animations
- countdown animation
- score changes
- leaderboard transitions
- connection status transitions

Respect:

```text
prefers-reduced-motion
```

---

# 25. Responsive Rules

Desktop:

Two-column layouts.

Tablet:

Compressed two-column layouts.

Mobile:

Single-column application UI.

Game:

Display:

> **Keyboard controls required**

if the game cannot support touch controls yet.

---

# 26. Component System

Create reusable components:

```text
Button
Card
Modal
Input
Avatar
Badge
Tooltip
Toast
Tabs
Dropdown
LeaderboardRow
PlayerCard
RoomCard
ScoreDisplay
ConnectionIndicator
ChatPanel
GameHUD
```

Avoid duplicating UI logic.

---

# 27. UX Principle

Every screen should answer:

1. Where am I?
2. What is happening?
3. What can I do?
4. What happens next?

The multiplayer experience must always communicate connection state and game state clearly.