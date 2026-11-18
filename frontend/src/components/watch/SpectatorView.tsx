import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Clock,
  Loader2,
  ShieldAlert,
  Users,
  Trophy,
  LogOut,
  Lock,
  Radio,
  WifiOff,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Star,
  UserRound,
} from 'lucide-react';
import { useSpectatorStore } from '../../store/spectatorStore';
import { useAuthStore } from '../../store/authStore';
import { useAuthPromptStore } from '../../store/authPromptStore';
import { socialService } from '../../services/social.service';
import { getGameTheme } from './gameTheme';
import { SpectatorChat } from './SpectatorChat';
import { GuestPrompt } from './GuestPrompt';
import { NeonDashStage } from './stages/NeonDashStage';
import { ReactionRushStage } from './stages/ReactionRushStage';
import { TerritoryStage } from './stages/TerritoryStage';
import { WordBlitzStage } from './stages/WordBlitzStage';

const formatClock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const SpectatorScoreboard: React.FC<{
  gameType: string;
  players: any[];
  followed: Record<string, boolean>;
  onToggleFollow: (playerId: string) => void;
}> = ({ gameType, players, followed, onToggleFollow }) => {
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  const secondaryMetric = (player: any): string | null => {
    if (gameType === 'Reaction Rush') {
      return typeof player.lastReactionMs === 'number' ? `${player.lastReactionMs}ms` : null;
    }
    if (gameType === 'Territory') {
      return typeof player.territoriesControlled === 'number'
        ? `${player.territoriesControlled} CELLS`
        : null;
    }
    if (gameType === 'Word Blitz') {
      return typeof player.correctCount === 'number' ? `${player.correctCount} OK` : null;
    }
    if (Array.isArray(player.activePowerUps) && player.activePowerUps.length > 0) {
      return `${player.activePowerUps.length} BOOST`;
    }
    return null;
  };

  return (
    <div className="bg-nexus-surface border border-nexus-border rounded-card overflow-hidden">
      <div className="px-3.5 py-2.5 bg-nexus-card border-b border-nexus-border flex items-center justify-between font-heading text-[11px] font-bold uppercase tracking-wider text-white">
        <span className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> LIVE SCOREBOARD
        </span>
        <span className="font-mono text-[10px] text-nexus-muted">{players.length} PLAYERS</span>
      </div>

      <div className="divide-y divide-nexus-border/50 font-mono text-[11px]">
        {sorted.length === 0 ? (
          <div className="px-3.5 py-5 text-center text-nexus-muted italic">Waiting for players...</div>
        ) : (
          sorted.map((player, index) => (
            <div key={player.id} className="flex items-center justify-between gap-2 px-3.5 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] font-bold ${
                    index === 0
                      ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                      : 'bg-nexus-card text-nexus-muted border border-nexus-border'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-white truncate">{player.username}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {secondaryMetric(player) && (
                  <span className="text-[9px] text-nexus-muted uppercase">
                    {secondaryMetric(player)}
                  </span>
                )}
                <span className="font-bold text-nexus-cyan">{player.score ?? 0}</span>
                <button
                  type="button"
                  onClick={() => onToggleFollow(player.id)}
                  aria-pressed={Boolean(followed[player.id])}
                  aria-label={
                    followed[player.id] ? `Unfollow ${player.username}` : `Follow ${player.username}`
                  }
                  title={followed[player.id] ? 'Following' : 'Follow player'}
                  className="p-1 rounded text-nexus-muted hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      followed[player.id] ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SpectatorResultsPanel: React.FC<{
  results: any;
  cancelled: boolean;
  isGuest: boolean;
  onExit: () => void;
}> = ({ results, cancelled, isGuest, onExit }) => {
  const standings: any[] = results?.standings || [];

  return (
    <div className="flex-1 flex items-center justify-center p-2">
      <div className="w-full max-w-xl rounded-card bg-nexus-surface border-2 border-nexus-accent p-6 sm:p-8 space-y-6 text-center glow-accent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nexus-accent/20 border border-nexus-accent/40 text-nexus-accent font-mono text-[11px] uppercase font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            {cancelled ? 'MATCH CANCELLED' : 'MATCH COMPLETED'}
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-wider uppercase">
            {cancelled ? 'NO RESULT' : standings[0] ? `${standings[0].username} WINS` : 'MATCH OVER'}
          </h2>
          <p className="font-mono text-[11px] text-nexus-muted uppercase tracking-widest">
            Spectators do not earn XP or placements
          </p>
        </div>

        {standings.length > 0 && (
          <div className="rounded-btn bg-nexus-card border border-nexus-border overflow-hidden text-left">
            <table className="w-full font-mono text-[11px] sm:text-xs">
              <tbody className="divide-y divide-nexus-border/50">
                {standings.map((entry) => (
                  <tr key={entry.userId}>
                    <td className="py-2.5 px-3 text-nexus-muted">#{entry.rank}</td>
                    <td className="py-2.5 px-3 font-heading font-bold text-white truncate max-w-[140px]">
                      {entry.username}
                    </td>
                    <td className="py-2.5 px-3 text-right text-nexus-cyan font-bold">
                      {(entry.score ?? 0).toLocaleString()} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={onExit}
          className="px-6 py-3 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO WATCH
        </button>

        {/* Post-match conversion: offered after the match, never during it */}
        {isGuest && <GuestPrompt kind="compete" variant="strip" className="text-center" />}
      </div>
    </div>
  );
};

const SpectatorClosedPanel: React.FC<{ message: string | null; onExit: () => void }> = ({
  message,
  onExit,
}) => (
  <div className="flex-1 flex items-center justify-center p-2">
    <div className="w-full max-w-md rounded-card bg-nexus-surface border border-nexus-border p-6 space-y-5 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-nexus-card border border-nexus-border flex items-center justify-center">
        <WifiOff className="w-6 h-6 text-nexus-muted" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider">
          MATCH NO LONGER LIVE
        </h2>
        <p className="text-sm text-nexus-muted break-words">
          {message || 'The live feed for this match has ended.'}
        </p>
      </div>
      <button
        onClick={onExit}
        className="px-5 py-2.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all glow-accent inline-flex items-center gap-2 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> BACK TO WATCH
      </button>
    </div>
  </div>
);

export const SpectatorView: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const accessCode = searchParams.get('code') || undefined;

  const {
    status,
    room,
    viewer,
    spectatorCount,
    spectatorLimit,
    gameState,
    results,
    cancelled,
    error,
    requiresAccessCode,
    isConnectionLost,
    initSpectatorListeners,
    cleanupSpectatorListeners,
    join,
    leave,
  } = useSpectatorStore();

  const token = useAuthStore((state) => state.token);
  const requestAuth = useAuthPromptStore((state) => state.requestAuth);

  const [codeInput, setCodeInput] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [followError, setFollowError] = useState<string | null>(null);

  const canChat = viewer?.canChat === true;
  const isGuest = viewer?.isGuest ?? false;

  // Registered viewers get their follow list; guests never load one
  useEffect(() => {
    if (!viewer?.canFollow || !token) return;

    let isCancelled = false;
    socialService
      .listFollows(token)
      .then((list) => {
        if (isCancelled) return;
        const next: Record<string, boolean> = {};
        for (const entry of list) next[entry.playerId] = true;
        setFollowed(next);
      })
      .catch(() => {
        // A missing social session must never block watching
      });

    return () => {
      isCancelled = true;
    };
  }, [viewer?.canFollow, token]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!matchId) return;

    initSpectatorListeners();
    void join(matchId, accessCode).catch(() => {
      // Failure state is surfaced through the store
    });

    return () => {
      leave();
      cleanupSpectatorListeners();
    };
  }, [matchId, accessCode, initSpectatorListeners, cleanupSpectatorListeners, join, leave]);

  const exitToWatch = () => {
    leave();
    navigate('/watch');
  };

  const retryWithCode = () => {
    if (!matchId || !codeInput.trim()) return;
    void join(matchId, codeInput.trim().toUpperCase()).catch(() => {});
  };

  const toggleFollow = async (playerId: string) => {
    // Guests cannot follow: their click becomes a prompt instead of a request
    if (!viewer?.canFollow || !token) {
      requestAuth('follow');
      return;
    }

    const isFollowing = Boolean(followed[playerId]);
    setFollowError(null);

    try {
      if (isFollowing) {
        await socialService.unfollow(token, playerId);
      } else {
        await socialService.follow(token, playerId);
      }
      setFollowed((previous) => ({ ...previous, [playerId]: !isFollowing }));
    } catch (err: any) {
      setFollowError(err?.message || 'Unable to update this follow');
    }
  };

  // ---------------------------------------------------------------- joining
  if (status === 'idle' || status === 'joining') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-nexus-card border border-nexus-border flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-nexus-cyan animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider">
              CONNECTING TO MATCH
            </h2>
            <p className="font-mono text-xs text-nexus-muted">
              Verifying visibility, access, and spectator capacity...
            </p>
          </div>
          <button
            onClick={exitToWatch}
            className="font-heading text-[11px] uppercase tracking-wider text-nexus-muted hover:text-white transition-colors cursor-pointer"
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ error
  if (status === 'error') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-card bg-nexus-surface border border-nexus-border p-6 space-y-5 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-nexus-danger/15 border border-nexus-danger/40 flex items-center justify-center">
            {requiresAccessCode ? (
              <Lock className="w-6 h-6 text-nexus-danger" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-nexus-danger" />
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wider">
              UNABLE TO WATCH
            </h2>
            <p className="text-sm text-nexus-muted break-words">{error}</p>
          </div>

          {requiresAccessCode && (
            <div className="space-y-2 text-left">
              <label
                htmlFor="spectator-retry-code"
                className="text-[11px] font-mono text-nexus-muted uppercase"
              >
                SPECTATOR ACCESS CODE
              </label>
              <input
                id="spectator-retry-code"
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                className="w-full px-3.5 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white font-mono text-sm tracking-[0.2em] uppercase focus:outline-none focus:border-nexus-accent transition-colors"
              />
              <button
                onClick={retryWithCode}
                disabled={!codeInput.trim()}
                className="w-full py-2.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-40 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" /> RETRY WITH CODE
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-2.5 pt-1">
            <button
              onClick={() => matchId && void join(matchId, accessCode).catch(() => {})}
              className="px-4 py-2 rounded-btn bg-nexus-card border border-nexus-border text-white font-heading text-xs font-bold uppercase tracking-wider hover:border-nexus-cyan transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> RETRY
            </button>
            <button
              onClick={exitToWatch}
              className="px-4 py-2 rounded-btn bg-nexus-card border border-nexus-border text-nexus-muted font-heading text-xs font-bold uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
            >
              BACK TO WATCH
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------- watching / ended
  const gameType = room?.gameType || 'Arena';
  const theme = getGameTheme(gameType);
  const GameIcon = theme.icon;
  const guestLabel = viewer?.viewerHandle
    ? `GUEST-${viewer.viewerHandle.slice(-4).toUpperCase()}`
    : 'GUEST';
  const snapshot = gameState?.state || {};
  const players: any[] = snapshot.players || [];
  const endsAt = typeof snapshot.endsAt === 'number' ? snapshot.endsAt : 0;
  const isEnded = status === 'ended';
  const liveStatus = String(snapshot.status || (isEnded ? 'FINISHED' : 'COUNTDOWN'));

  const renderStage = () => {
    if (isEnded) {
      // A cancelled or evicted session has no standings to show
      if (!results) {
        return <SpectatorClosedPanel message={error} onExit={exitToWatch} />;
      }
      return (
        <SpectatorResultsPanel
          results={results}
          cancelled={cancelled}
          isGuest={isGuest}
          onExit={exitToWatch}
        />
      );
    }

    if (!gameState) {
      return (
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div className="space-y-2">
            <Loader2 className="w-6 h-6 mx-auto text-nexus-cyan animate-spin" />
            <p className="font-mono text-xs text-nexus-muted uppercase tracking-widest">
              WAITING FOR FIRST SNAPSHOT
            </p>
          </div>
        </div>
      );
    }

    switch (gameType) {
      case 'Reaction Rush':
        return <ReactionRushStage state={snapshot} />;
      case 'Territory':
        return <TerritoryStage state={snapshot} />;
      case 'Word Blitz':
        return <WordBlitzStage state={snapshot} />;
      case 'Neon Dash':
      default:
        return <NeonDashStage state={snapshot} />;
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-card bg-nexus-surface border border-nexus-border px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 shrink-0 rounded-btn border flex items-center justify-center ${theme.iconBox}`}>
            <GameIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-extrabold text-lg sm:text-xl text-white tracking-wide truncate">
                {room?.name || 'LIVE MATCH'}
              </h1>
              <span className={`px-2 py-0.5 rounded-full border font-mono text-[9px] uppercase font-bold tracking-wider ${theme.chip}`}>
                {theme.label}
              </span>
              {viewer?.isGuest && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-nexus-card border border-nexus-border text-nexus-muted font-mono text-[9px] uppercase font-bold tracking-wider">
                  <UserRound className="w-2.5 h-2.5" /> {guestLabel}
                </span>
              )}
              {isEnded ? (
                <span className="px-2 py-0.5 rounded-full bg-nexus-card border border-nexus-border text-nexus-muted font-mono text-[9px] uppercase font-bold">
                  ENDED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-nexus-danger/15 border border-nexus-danger/40 text-nexus-danger font-mono text-[9px] uppercase font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-nexus-danger animate-pulse" /> LIVE
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] text-nexus-muted uppercase tracking-widest truncate">
              HOST {room?.hostName || '—'} • {room?.playerCount || players.length}/{room?.maxPlayers || '—'} PLAYERS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border font-mono text-[11px] text-nexus-muted">
            <Clock className="w-3.5 h-3.5 text-nexus-cyan" />
            <span className="text-white font-bold">
              {isEnded ? '--:--' : endsAt ? formatClock(endsAt - now) : '--:--'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border font-mono text-[11px] text-nexus-muted">
            <Eye className="w-3.5 h-3.5 text-nexus-accent" />
            <span className="text-white font-bold">{spectatorCount}</span>
            {spectatorLimit > 0 && (
              <span className="text-nexus-muted">/{spectatorLimit}</span>
            )}
          </div>
          <button
            onClick={exitToWatch}
            className="px-3 py-1.5 rounded-btn bg-nexus-card border border-nexus-border hover:border-nexus-danger/60 text-nexus-muted hover:text-nexus-danger font-heading text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> LEAVE
          </button>
        </div>
      </div>

      {/* Connection notice */}
      {isConnectionLost && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-card bg-nexus-warning/10 border border-nexus-warning/40 text-nexus-warning font-mono text-[11px]">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Reconnecting to the live feed. The last known state is shown below.</span>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-4">
        <div className="min-h-[380px] lg:min-h-[580px] flex flex-col rounded-card bg-nexus-bg/60 border border-nexus-border p-2 sm:p-3 overflow-hidden">
          {renderStage()}
        </div>

        <aside className="space-y-3 min-w-0">
          <div className="flex items-center justify-between px-1">
            <span className="font-heading text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-nexus-cyan" /> MATCH FEED
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-nexus-muted">
              <Radio className="w-3 h-3 text-nexus-cyan" /> {liveStatus}
            </span>
          </div>

          <SpectatorScoreboard
            gameType={gameType}
            players={players}
            followed={followed}
            onToggleFollow={toggleFollow}
          />

          {followError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-card bg-nexus-warning/10 border border-nexus-warning/40 text-nexus-warning font-mono text-[10px]">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="flex-1 break-words">{followError}</span>
              <button
                type="button"
                onClick={() => setFollowError(null)}
                className="text-nexus-warning hover:text-white cursor-pointer"
                aria-label="Dismiss follow error"
              >
                ×
              </button>
            </div>
          )}

          {/* Guests keep the full feed; an account adds chat, follows and alerts */}
          {!canChat && <GuestPrompt kind="follow" variant="strip" />}

          <SpectatorChat isEnded={isEnded} />

          <div className="rounded-card bg-nexus-surface border border-nexus-border p-3.5 space-y-2">
            <h3 className="font-heading text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-nexus-accent" /> OBSERVER RULES
            </h3>
            <ul className="font-mono text-[10px] text-nexus-muted space-y-1.5 leading-relaxed">
              <li className="flex gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-nexus-success shrink-0 mt-0.5" />
                Spectators cannot move, click, submit, or capture.
              </li>
              <li className="flex gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-nexus-success shrink-0 mt-0.5" />
                No player slots, XP, or leaderboard changes.
              </li>
              <li className="flex gap-1.5">
                <Lock className="w-3 h-3 text-nexus-cyan shrink-0 mt-0.5" />
                Hidden server data stays hidden until the server reveals it.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};
