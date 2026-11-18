# NEXUS ARENA --- WATCH / SPECTATOR MODE

## Implementation Brief for the Coding Agent

**Feature:** Live match discovery and spectator experience\
**Product:** NEXUS ARENA\
**Priority:** Platform-level feature\
**Implementation rule:** Extend the existing application. Do not rebuild
the lobby, room system, authentication, Socket.IO infrastructure, games,
or design system.

------------------------------------------------------------------------

## 1. Objective

Implement a first-class **WATCH** section that allows users to discover
and spectate ongoing NEXUS ARENA matches.

Users should be able to:

-   Browse live public matches.
-   Filter matches by game.
-   Search for a match or room.
-   See match details, player names, player count, spectator count, game
    type, and match status.
-   Join a public match as a spectator without occupying a player slot.
-   Access private matches only with a valid spectator access code.
-   Watch the live game state in a spectator-only interface.
-   Chat with other spectators where spectator chat is enabled.
-   View final results when a match ends.

The feature must work across all supported game modes:

-   Neon Dash
-   Reaction Rush
-   Territory
-   Word Blitz

The Watch experience should make NEXUS ARENA useful even when a user is
not actively playing.

## 2. Mandatory Repository Audit

Before implementation, inspect the existing repository and document the
relevant architecture.

Inspect:

-   Frontend framework, routing, layouts, and navigation.
-   Backend framework and API structure.
-   Authentication and user identity.
-   Existing room and lobby models.
-   Public/private room visibility and join-by-code behavior.
-   Socket.IO server/client setup and room naming conventions.
-   Player membership, host permissions, ready state, and disconnect
    handling.
-   Game lifecycle and server-authoritative game state for every game.
-   Existing chat implementation.
-   Match results and leaderboard integration.
-   Database models and migration conventions.
-   Existing UI components, design tokens, and responsive patterns.
-   Existing tests and test commands.

Do not assume the architecture described in this brief exactly matches
the repository. Adapt to the actual implementation.

**Preserve existing behavior.** Neon Dash and all current room, lobby,
authentication, chat, profile, leaderboard, and progression features
must continue working.

Do not perform a broad refactor merely to implement Watch. If a shared
abstraction is genuinely needed, make the smallest safe change and test
existing consumers.

## 3. Product and Access Model

Every room/match should have a visibility policy. Reuse existing fields
if they already express these concepts; otherwise extend the room model
cleanly.

Recommended visibility values:

``` ts
type RoomVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";
```

### Public

-   Appears in the Watch directory while the match is active and
    spectating is enabled.
-   Can be opened by any authenticated user permitted by the product's
    access rules.
-   Does not require a room code to spectate.
-   Can be filtered by game type.
-   May be searchable by room name or host/player name if supported.

### Private

-   Never appears in public Watch listings, search results, featured
    matches, or public live counts that reveal its existence.
-   Requires a valid spectator access code or equivalent authorized
    invitation.
-   The server must verify the code and match visibility before granting
    spectator access.
-   Do not treat knowledge of a room ID as authorization.

### Unlisted

-   Does not appear in public listings or search.
-   Can be watched by users who possess a valid spectator link/code.
-   Must still pass server-side access validation.

### Spectator setting

Allow the room host to enable or disable spectating, subject to existing
host permissions.

Recommended room settings:

``` ts
{
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED",
  allowSpectators: boolean,
  spectatorLimit: number
}
```

Use sensible defaults consistent with the current room-creation
behavior. Do not silently make existing private rooms public. Existing
rooms should retain their current privacy semantics.

If the current product has no unlisted concept, implement it only if it
fits cleanly with existing room creation and access controls. Do not let
it delay the essential public/private behavior.

## 4. Navigation and Watch Directory

Add **WATCH** as a first-class navigation item, consistent with the
existing NEXUS ARENA navigation and responsive menu.

Suggested page route:

``` text
/watch
```

Use the repository's routing conventions if different.

### Watch page content

The page should include:

1.  Page heading: `WATCH ARENA`
2.  Short supporting description.
3.  Live match count.
4.  Optional total public player/spectator counts, calculated only from
    public discoverable matches.
5.  Game filters:
    -   All Games
    -   Neon Dash
    -   Reaction Rush
    -   Territory
    -   Word Blitz
6.  Search field, if supported by the current product patterns.
7.  Live match cards.
8.  Empty, loading, error, and reconnecting states.
9.  A private-match access-code entry point.

### Match card information

Each card should show only information that is safe and useful to
spectators:

-   Game name and game-specific visual identity.
-   Room/match name.
-   Host or participating player names/avatars, subject to profile
    privacy.
-   Player count and maximum player count.
-   Spectator count.
-   Match status.
-   Public visibility indicator where useful.
-   A `WATCH MATCH` action.

Only active, spectatable, public matches should appear in the public
directory. Do not show private or unlisted matches.

Do not display a Join Player action in Watch cards. Spectating and
playing are separate actions and permissions.

### Filters and search

-   Filters must operate on real server-provided match data.
-   Game filters must use stable game identifiers, not display labels.
-   Search must not reveal private/unlisted room names or metadata.
-   Keep filters usable on mobile.
-   Show a clear empty state when no matches meet the selected filter.

### Featured matches

Treat featured matches as a later/optional enhancement unless the
repository already has a moderation or featured-content mechanism. Do
not invent an unauthorised way for clients to promote their own rooms.

## 5. Spectator Experience

Suggested route:

``` text
/watch/:matchId
```

Use existing route conventions.

Create a dedicated spectator view that reuses the actual game rendering
where practical, but does not reuse player controls as active controls.

### Shared spectator layout

Display:

-   Game canvas or game-specific viewing surface.
-   Match/room name.
-   Game type.
-   Live status and match timer.
-   Player list and player status.
-   Current scoreboard.
-   Spectator count.
-   Leave-watch action.
-   Spectator chat, if enabled.
-   Match-ended state and final results.

The spectator view must be responsive and must not let chat or HUD
elements obscure important gameplay, particularly on mobile.

### Game-specific spectator views

**Neon Dash** - Render the authoritative live positions and progress of
all players. - Show player identities and current positions/rank where
the game state supports it. - Do not expose player input controls. -
Reuse the existing game renderer where possible.

**Reaction Rush** - Show the active target, round state, countdown, and
public round results. - Spectators must not be able to click targets or
submit reaction events. - Do not expose hidden server timing or internal
validation data before it is safe to reveal.

**Territory** - Render the shared map and public territory
ownership/capture state. - Show player positions and scores only if
these are already part of the public game state. - Do not allow
spectators to send movement or capture actions.

**Word Blitz** - Show public prompts, round status, submitted-answer
status where appropriate, and scoreboard. - Never expose the correct
answer before the round ends. - Do not send spectator clients private
answer keys, hidden challenge data, or player-only information.

If a game's current state model does not yet support safe spectator
rendering, add an explicit spectator-safe state projection on the
server. Do not send the complete internal game state and hide sensitive
fields only in the UI.

## 6. Membership, Roles, and Permissions

Implement spectator membership as a distinct role, adapting to the
existing model:

``` ts
type RoomRole = "PLAYER" | "HOST" | "SPECTATOR";
```

A host may also be a player; do not force mutually exclusive roles if
the current data model separates host status from membership role.

Spectators:

-   Do not consume player slots.
-   Cannot become ready.
-   Cannot start, pause, or end matches.
-   Cannot move, click game targets, submit answers, capture territory,
    or perform any game action.
-   Cannot change scores, XP, placements, or results.
-   Cannot invoke player-only room controls.
-   Can receive only spectator-safe game state.
-   Can send spectator chat messages only if chat is enabled and they
    pass rate limits.
-   Must be removed from spectator membership when they leave or
    disconnect.

Every server action must derive identity from the authenticated
socket/session. Never trust a client-supplied `userId`, role, room
membership, or permission claim.

A player who is already in a room must not be able to create duplicate
player/spectator memberships for the same match. Define and test the
expected behavior for a player switching to spectator mode.

## 7. Socket.IO and Real-Time Architecture

Extend the existing Socket.IO implementation. Do not create a second
socket server or a parallel real-time stack.

Use the repository's established event naming conventions. The following
are suggested event names, not a requirement to duplicate an existing
event API.

### Client → Server

``` text
spectator:join
spectator:leave
spectator:chat
```

A join request may contain:

``` ts
{
  matchId: string;
  accessCode?: string;
}
```

Do not accept client-supplied user identity, role, game state, or
permissions.

### Server → Client

``` text
spectator:joined
spectator:left
spectator:count_update
spectator:game_state
spectator:chat_message
spectator:match_ended
spectator:error
```

### Join sequence

1.  Authenticate the socket.
2.  Validate the match ID and payload schema.
3.  Load the match/room from trusted server state.
4.  Verify the match is active and spectating is enabled.
5.  Verify visibility and access-code requirements.
6.  Verify spectator capacity.
7.  Verify the user is not already a conflicting member.
8.  Add the user to the spectator membership/Socket.IO channel.
9.  Send an initial spectator-safe snapshot.
10. Send updated spectator counts to authorized room members and public
    directory subscribers as appropriate.

The server must not join the socket to a private room's broadcast
channel until access has been validated.

### State broadcasting

-   Use the server-authoritative game state as the source of truth.
-   Create a spectator-safe projection for each game.
-   Broadcast meaningful updates at an appropriate rate.
-   Prefer deltas for high-frequency or large state changes where
    practical.
-   Provide a full snapshot on initial join and reconnect.
-   Do not broadcast private information to public directory
    subscribers.
-   Do not send the same large payload unnecessarily.
-   Ensure spectators receive updates for the correct match only.

Do not introduce a new game loop solely for spectators. Subscribe
spectators to the existing authoritative game lifecycle/state updates.

## 8. Spectator Directory API

Adapt endpoint names and response conventions to the existing backend.

Suggested API:

``` text
GET /api/matches/live
GET /api/matches/live?gameType=neon-dash
GET /api/matches/:matchId/spectator-info
```

The live directory endpoint must:

-   Return only public matches.
-   Return only active matches that allow spectating.
-   Exclude private and unlisted rooms entirely.
-   Support game-type filtering.
-   Return only fields required to render match cards.
-   Avoid exposing access codes, internal state, or private player data.
-   Use pagination or a bounded result set if the directory can grow.

For private/unlisted access, use a secure server-side validation flow.
Never create a public endpoint that returns whether arbitrary private
room codes exist in a way that enables code enumeration.

A private spectator access code should be random, sufficiently hard to
guess, stored securely (preferably hashed where practical),
rate-limited, and revocable/rotatable by an authorized host if
supported.

## 9. Spectator Chat

If the existing room chat can be safely extended, reuse its
infrastructure with spectator-aware permissions.

Requirements:

-   Clearly distinguish spectator messages from player messages.
-   Spectator chat must not automatically appear in player chat unless
    that is an intentional product decision.
-   Validate message length and payload.
-   Apply per-user/socket rate limits.
-   Sanitize/render message content safely.
-   Prevent impersonation and forged sender identity.
-   Respect room privacy and spectator authorization.
-   Clean up listeners and memberships on leave/disconnect.

If time is constrained, launch the Watch directory and live viewing
first, then add spectator chat as a separate phase.

## 10. Match Lifecycle and Results

Watch directory behavior must reflect the real match lifecycle.

-   Waiting rooms should not be listed as live matches unless the
    product explicitly chooses to support spectating before the match
    starts.
-   Active matches can be listed if public and spectating is enabled.
-   Finished matches must be removed from the live directory.
-   Spectators already watching should receive a match-ended event and
    final public results.
-   The spectator view should transition to a results summary.
-   Spectators must not receive XP or match rewards.
-   Spectators must not count as participants in match statistics,
    player leaderboards, or progression.
-   If a match is cancelled or the host ends it, viewers should receive
    an appropriate status update.

Do not award progression or alter player results because of spectator
activity.

## 11. Security and Abuse Prevention

Treat spectator access as a security boundary, not merely a UI mode.

Implement and test:

-   Authentication checks.
-   Public/private/unlisted access checks.
-   Secure access-code verification.
-   Rate limiting for join attempts and chat.
-   Spectator capacity enforcement.
-   Room membership validation for every event.
-   Role/permission validation for every event.
-   Payload schema validation.
-   Protection against room ID/code enumeration.
-   Protection against socket room spoofing.
-   Prevention of spectator gameplay inputs.
-   Prevention of spectators modifying scores or match state.
-   No private room data in public directory responses.
-   No hidden Word Blitz answers in spectator payloads.
-   No unnecessary personal information in spectator views.
-   Safe handling of reconnects and stale sockets.

Never trust the frontend to enforce spectator restrictions. The server
must reject unauthorized events even if a malicious client manually
emits them.

## 12. Performance and Reliability

-   Keep the public live directory updated without polling excessively.
-   Reuse existing Socket.IO subscriptions or a suitable existing API
    refresh strategy.
-   Avoid broadcasting every internal game tick if the spectator display
    does not need it.
-   Use appropriate update rates for each game.
-   Avoid sending full map/state payloads when a small delta is
    sufficient.
-   Enforce spectator limits to protect server resources.
-   Clean up timers, listeners, subscriptions, and socket-room
    memberships.
-   Handle disconnect/reconnect without duplicate spectator counts.
-   Ensure spectator count is based on unique authorized active
    spectator sessions/users according to the existing identity model.
-   Avoid leaking counts or metadata for private matches.

Do not invent performance metrics. Measure or profile the actual
implementation where feasible.

## 13. UI and Design Requirements

Preserve the existing NEXUS ARENA visual identity:

-   Near-black/dark surfaces.
-   Purple primary accent.
-   Cyan secondary accent.
-   Sharp, technical typography.
-   Restrained glow and motion.
-   Clear contrast and hierarchy.
-   Existing component patterns, spacing, borders, and icon style.

Do not redesign the existing platform.

### Watch directory visual direction

The page should feel like a polished live esports match directory, not
an admin dashboard.

Include:

-   `WATCH ARENA` heading.
-   Live indicator.
-   Game filter controls.
-   Search where appropriate.
-   Match cards with game identity and live status.
-   Player/spectator counts.
-   Clear `WATCH MATCH` action.
-   Private match code entry.
-   Loading, empty, error, and offline/reconnecting states.

Do not hardcode illustrative match cards or fake live statistics in
production. Use real API/socket data. Any design placeholders must be
clearly confined to development previews or tests.

### Mobile

-   Filters must wrap or become a compact scrollable control.
-   Match cards must remain readable.
-   Spectator HUD must fit narrow screens.
-   Chat should collapse into a panel/drawer if necessary.
-   Touch targets must be accessible.
-   No horizontal page overflow.
-   Gameplay must remain visible and usable.

## 14. Data Model Considerations

Inspect existing models before adding fields. Reuse existing room/match
entities where possible.

Potential fields:

``` ts
{
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  allowSpectators: boolean;
  spectatorLimit: number;
  spectatorAccessCodeHash?: string;
}
```

Do not persist transient spectator socket IDs as permanent user
membership. Use the existing presence/session model or a carefully
managed ephemeral presence structure.

If match records are persisted, store only the information needed for
history/results. Keep live socket presence ephemeral unless the existing
architecture has a clear reason to persist it.

Add migrations using the repository's normal migration workflow.
Preserve existing room data and defaults.

## 15. Testing Requirements

Add tests using the repository's existing test framework.

### Directory tests

-   Public active spectatable matches appear.
-   Private matches never appear.
-   Unlisted matches never appear.
-   Finished matches disappear.
-   Spectating-disabled matches do not appear.
-   Game filters return correct results.
-   Search cannot expose private metadata.

### Access tests

-   Public match can be spectated without a code.
-   Private match rejects missing/invalid code.
-   Private match accepts a valid code.
-   Unlisted match requires its authorized link/code.
-   Disabled spectating rejects all spectator joins.
-   Spectator limit is enforced.
-   Unauthorized users cannot join by guessing a match ID.
-   Repeated join requests do not inflate counts.

### Permission tests

-   Spectators cannot emit player movement/input.
-   Spectators cannot ready up or start/end matches.
-   Spectators cannot modify scores or results.
-   Spectators cannot receive XP.
-   Spectators cannot submit Word Blitz answers.
-   Spectators cannot trigger Reaction Rush hits.
-   Spectators cannot capture Territory cells.
-   Spectators cannot control Neon Dash players.

### Real-time tests

-   Spectator receives initial state snapshot.
-   Spectator receives subsequent authorized updates.
-   Spectator receives match-ended event.
-   Disconnect decrements count exactly once.
-   Reconnect restores the correct snapshot.
-   Private room events never reach unauthorized sockets.
-   Spectator chat is validated and rate-limited.

### Regression tests

Verify existing:

-   Authentication.
-   Lobby and room creation.
-   Join by code.
-   Player slots and ready state.
-   Room chat.
-   Host controls.
-   Neon Dash.
-   Other implemented games.
-   Match results.
-   Leaderboards.
-   XP/level progression, if already implemented.

## 16. Recommended Implementation Phases

Implement in small, verifiable phases. Do not attempt a blind one-shot
rewrite.

### Phase 1 --- Audit and design

-   Inspect current architecture.
-   Identify the authoritative match state and lifecycle for each game.
-   Identify privacy/access-code implementation.
-   Identify reusable room and chat components.
-   Produce a short implementation plan and list of files to change.

### Phase 2 --- Room visibility and spectator permissions

-   Add/confirm public/private/unlisted visibility.
-   Add/confirm `allowSpectators` and spectator limit.
-   Implement server-side spectator role and authorization.
-   Preserve existing private-room behavior.

### Phase 3 --- Live match directory

-   Add Watch navigation and page.
-   Implement public live-match endpoint/subscription.
-   Add game filters and search.
-   Add real match cards and empty/loading/error states.
-   Add private-code entry.

### Phase 4 --- Spectator state delivery

-   Implement spectator join/leave lifecycle.
-   Add safe state projections.
-   Add initial snapshots and live updates.
-   Implement reconnect and presence handling.

### Phase 5 --- Game-specific spectator views

-   Neon Dash spectator rendering.
-   Reaction Rush spectator rendering.
-   Territory spectator rendering.
-   Word Blitz spectator rendering with answer secrecy.

### Phase 6 --- Results and optional chat

-   Match-ended transition and results.
-   Spectator chat if it can be safely added without compromising core
    delivery.

### Phase 7 --- Quality and regression

-   Run unit and integration tests.
-   Run existing project checks/build.
-   Test with multiple real browser clients.
-   Test mobile layout.
-   Review authorization and private-data leakage.
-   Fix regressions before declaring completion.

## 17. Definition of Done

The feature is not complete just because the Watch page renders.

``` text
[ ] WATCH is accessible from primary navigation.
[ ] Live directory uses real match data.
[ ] Public active spectatable matches are discoverable.
[ ] Game filters work correctly.
[ ] Search does not reveal private matches.
[ ] Private matches require valid spectator access codes.
[ ] Unlisted matches are not publicly discoverable.
[ ] Hosts can disable spectating.
[ ] Spectators do not consume player slots.
[ ] Spectators have a distinct permission boundary.
[ ] Spectator view receives an initial game-state snapshot.
[ ] Spectator view receives real-time updates.
[ ] All four games have spectator-safe views.
[ ] Word Blitz answers remain secret until reveal.
[ ] Spectators cannot perform gameplay actions.
[ ] Spectators cannot affect scores, XP, or leaderboards.
[ ] Spectator counts remain accurate through disconnect/reconnect.
[ ] Finished matches leave the live directory.
[ ] Viewers receive final public results.
[ ] Spectator chat is secure if implemented.
[ ] Mobile layout is usable.
[ ] Existing game/player functionality still works.
[ ] Tests and production build pass.
[ ] No private match data is exposed to unauthorized clients.
```

## 18. Agent Operating Instructions

-   Start by auditing. Do not start coding before understanding the
    current architecture.
-   Follow existing framework, language, naming, and folder conventions.
-   Reuse existing authentication, room, Socket.IO, game-rendering, and
    design systems.
-   Do not duplicate the game engine or create a second socket server.
-   Do not use mock data as a substitute for actual live functionality.
-   Do not claim a feature is complete unless it has been implemented
    and tested.
-   If an existing game lacks spectator-safe state, explain the gap and
    implement the smallest safe server-side projection.
-   Keep changes incremental and run relevant tests after each phase.
-   Report files changed, architectural decisions, tests run, results,
    known limitations, and the next recommended step.

**Product principle:** Players control the match. Spectators observe the
match. The server decides what each role is allowed to see and do.

**NEXUS ARENA WATCH should feel like a natural extension of the existing
platform---not a separate application.**
