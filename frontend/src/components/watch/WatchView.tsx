import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Radio,
  RefreshCw,
  Search,
  Trophy,
  Users,
  WifiOff,
  KeyRound,
  PlayCircle,
  AlertTriangle,
  Gamepad2,
  Crown,
  UserRound,
} from 'lucide-react';
import { LiveMatchSummary } from '../../shared/index.js';
import { useAuthStore } from '../../store/authStore';
import { useWatchStore, WATCH_GAME_FILTERS } from '../../store/watchStore';
import { socketService } from '../../services/socket.service';
import { getGameTheme } from './gameTheme';
import { CodeEntryModal } from './CodeEntryModal';
import { GuestPrompt } from './GuestPrompt';

const useNow = (intervalMs: number): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};

const formatElapsed = (startedAt: string, now: number): string => {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return '00:00';
  const elapsed = Math.max(0, now - started);
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; accent: string }> = ({
  label,
  value,
  icon,
  accent,
}) => (
  <div className="rounded-card bg-nexus-surface border border-nexus-border px-4 py-3 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-btn flex items-center justify-center border ${accent}`}>{icon}</div>
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-nexus-muted">{label}</div>
      <div className="font-heading font-extrabold text-xl text-white leading-tight">{value}</div>
    </div>
  </div>
);

const MatchCard: React.FC<{ match: LiveMatchSummary; now: number; onWatch: () => void }> = ({
  match,
  now,
  onWatch,
}) => {
  const theme = getGameTheme(match.gameType);
  const Icon = theme.icon;
  const others = match.playerCount - 1;

  return (
    <article
      className={`group relative rounded-card bg-nexus-surface border border-nexus-border p-5 space-y-4 transition-all shadow-xl ${theme.hoverBorder}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 shrink-0 rounded-btn border flex items-center justify-center ${theme.iconBox}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-lg text-white tracking-wide truncate">
              {match.name}
            </h3>
            <span className="font-mono text-[10px] text-nexus-muted uppercase tracking-widest">
              {theme.label} • {theme.tagline}
            </span>
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-nexus-danger/15 border border-nexus-danger/40 text-nexus-danger font-mono text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-nexus-danger animate-pulse" /> LIVE
        </span>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border text-nexus-muted">
          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{match.hostName}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border text-nexus-muted">
          <Users className="w-3.5 h-3.5 text-nexus-cyan shrink-0" />
          <span className="truncate">
            {match.playerCount}/{match.maxPlayers} PLAYERS
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border text-nexus-muted">
          <Eye className="w-3.5 h-3.5 text-nexus-accent shrink-0" />
          <span className="truncate">
            {match.spectatorCount}
            {match.spectatorLimit > 0 ? `/${match.spectatorLimit}` : ''} WATCHING
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border text-nexus-muted">
          <Radio className="w-3.5 h-3.5 text-nexus-success shrink-0" />
          <span className="truncate">{formatElapsed(match.startedAt, now)} ELAPSED</span>
        </div>
      </div>

      {/* Players */}
      {match.players.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {match.players.slice(0, 6).map((player) => (
              <div
                key={player.id}
                title={player.username}
                className="w-7 h-7 rounded-full bg-nexus-card border border-nexus-border flex items-center justify-center font-heading font-bold text-[10px] text-white uppercase"
              >
                {player.username.substring(0, 2)}
              </div>
            ))}
          </div>
          <span className="font-mono text-[10px] text-nexus-muted truncate">
            {others > 0 ? `+${Math.min(others, 99)} IN ARENA` : 'SOLO RUN'}
          </span>
        </div>
      )}

      {/* Action */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-nexus-border/60">
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
            match.guestAccess ? 'text-nexus-success' : 'text-nexus-muted'
          }`}
        >
          {match.guestAccess ? (
            <>
              <UserRound className="w-3 h-3" /> OPEN TO GUESTS
            </>
          ) : (
            <>
              <KeyRound className="w-3 h-3" /> SPECTATOR CODE REQUIRED
            </>
          )}
        </span>
        <button
          onClick={onWatch}
          className="px-4 py-2 rounded-btn bg-nexus-card border border-nexus-border hover:bg-nexus-accent hover:border-nexus-accent text-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" /> WATCH MATCH
        </button>
      </div>
    </article>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="rounded-card bg-nexus-surface border border-nexus-border p-5 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-btn bg-nexus-card" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-nexus-card" />
        <div className="h-3 w-1/3 rounded bg-nexus-card" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-7 rounded-btn bg-nexus-card" />
      ))}
    </div>
    <div className="h-9 rounded-btn bg-nexus-card" />
  </div>
);

export const WatchView: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuthStore();
  const {
    matches,
    liveCount,
    totalPlayers,
    totalSpectators,
    gameFilter,
    search,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    setGameFilter,
    setSearch,
    fetchLiveMatches,
    initWatchListeners,
  } = useWatchStore();

  const [searchInput, setSearchInput] = useState(search);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const now = useNow(15_000);

  // Initial load + realtime subscription
  useEffect(() => {
    initWatchListeners();
    void fetchLiveMatches();
  }, [initWatchListeners, fetchLiveMatches]);
  // Debounced search against real server data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() === useWatchStore.getState().search.trim()) return;
      setSearch(searchInput);
      void fetchLiveMatches();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch, fetchLiveMatches]);

  // Connection health for the directory. Guests hold a socket too, so the
  // handshake is refreshed whenever the identity changes.
  useEffect(() => {
    const socket = socketService.connect(token);

    setIsLiveConnected(socket.connected);
    const handleConnect = () => setIsLiveConnected(true);
    const handleDisconnect = () => setIsLiveConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated, token]);

  // Fallback refresh while realtime updates are unavailable
  useEffect(() => {
    const timer = setInterval(() => {
      const socket = socketService.getSocket();
      if (!socket || !socket.connected) {
        void fetchLiveMatches({ silent: true });
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [fetchLiveMatches]);

  // Watching never asks for an account: public matches open straight away, and
  // private/unlisted matches are unlocked by their spectator code.
  const openMatch = (matchId: string, accessCode?: string) => {
    navigate(
      accessCode ? `/watch/${matchId}?code=${encodeURIComponent(accessCode)}` : `/watch/${matchId}`,
    );
  };

  const handleCodeEntry = () => {
    setIsCodeModalOpen(true);
  };

  const activeFilterLabel = useMemo(
    () => WATCH_GAME_FILTERS.find((f) => f.id === gameFilter)?.label || 'ALL GAMES',
    [gameFilter],
  );

  const showSkeletons = isLoading && matches.length === 0;
  const showEmpty = !isLoading && !error && matches.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 animate-fade-in">
      {/* Page heading */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nexus-danger/10 border border-nexus-danger/40 text-nexus-danger font-mono text-[11px] uppercase tracking-widest">
          <Eye className="w-3.5 h-3.5" /> SPECTATOR NETWORK
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              WATCH <span className="text-nexus-cyan">ARENA</span>
            </h1>
            <p className="text-nexus-muted text-sm sm:text-base max-w-2xl leading-relaxed">
              Live matches from every arena, streamed straight from the server-authoritative game
              loop. Observers see exactly what the server publishes — never hidden answers, inputs,
              or private room data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchLiveMatches({ silent: true })}
              className="px-3.5 py-2.5 rounded-btn bg-nexus-card border border-nexus-border hover:border-nexus-cyan text-nexus-muted hover:text-white font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> REFRESH
            </button>
            <button
              onClick={handleCodeEntry}
              className="px-3.5 py-2.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all glow-accent flex items-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> ACCESS CODE
            </button>
          </div>
        </div>
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="LIVE MATCHES"
          value={String(liveCount)}
          icon={<Radio className="w-4 h-4" />}
          accent="bg-nexus-danger/15 border-nexus-danger/40 text-nexus-danger"
        />
        <StatCard
          label="PLAYERS IN PLAY"
          value={String(totalPlayers)}
          icon={<Gamepad2 className="w-4 h-4" />}
          accent="bg-nexus-cyan/15 border-nexus-cyan/40 text-nexus-cyan"
        />
        <StatCard
          label="SPECTATORS WATCHING"
          value={String(totalSpectators)}
          icon={<Eye className="w-4 h-4" />}
          accent="bg-nexus-accent/15 border-nexus-accent/40 text-nexus-accent"
        />
      </div>

      {/* Reconnecting notice */}
      {!isLiveConnected && (
        <div className="flex items-start gap-3 p-3.5 rounded-card bg-nexus-warning/10 border border-nexus-warning/40 text-nexus-warning font-mono text-xs">
          <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Reconnecting to live updates. Showing the last known directory snapshot and refreshing
            periodically until the connection returns.
          </span>
        </div>
      )}

      {/* Guest conversion — dismissible, never blocks the directory */}
      {!isAuthenticated && (
        <GuestPrompt kind="compete" variant="strip" />
      )}

      {/* Filters + search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {WATCH_GAME_FILTERS.map((filter) => {
            const isActive = gameFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setGameFilter(filter.id)}
                className={`px-3.5 py-2 rounded-btn font-heading text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-nexus-accent text-white border-nexus-accent glow-accent'
                    : 'bg-nexus-card text-nexus-muted border-nexus-border hover:text-white hover:border-nexus-accent/60'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="relative lg:ml-auto lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-muted" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search match, host, or player..."
            className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-nexus-card border border-nexus-border text-white text-xs font-mono focus:outline-none focus:border-nexus-accent transition-colors"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-card bg-nexus-danger/10 border border-nexus-danger/40 text-nexus-danger font-mono text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => void fetchLiveMatches()}
            className="self-start sm:self-auto px-3 py-1.5 rounded-btn bg-nexus-card border border-nexus-border text-white font-heading text-[11px] font-bold uppercase tracking-wider hover:border-nexus-danger transition-colors cursor-pointer"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Directory */}
      {showSkeletons ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : showEmpty ? (
        <div className="rounded-card border border-dashed border-nexus-border bg-nexus-surface/40 px-6 py-14 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-nexus-card border border-nexus-border flex items-center justify-center">
            <Eye className="w-6 h-6 text-nexus-muted" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading text-xl font-bold text-white tracking-wider uppercase">
              NO LIVE MATCHES
            </h3>
            <p className="text-nexus-muted text-sm max-w-md mx-auto">
              {activeFilterLabel === 'ALL GAMES'
                ? 'No public matches are broadcasting right now. Start a match in the lobby, or check back in a moment.'
                : `No ${activeFilterLabel.toLowerCase()} matches are live. Try another game filter or check back shortly.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {gameFilter !== 'all' && (
              <button
                onClick={() => setGameFilter('all')}
                className="px-4 py-2 rounded-btn bg-nexus-card border border-nexus-border text-white font-heading text-xs font-bold uppercase tracking-wider hover:border-nexus-cyan transition-colors cursor-pointer"
              >
                SHOW ALL GAMES
              </button>
            )}
            <button
              onClick={() => navigate(isAuthenticated ? '/lobby' : '/')}
              className="px-4 py-2 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all glow-accent flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" /> GO TO LOBBY
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} now={now} onWatch={() => openMatch(match.id)} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-nexus-border/60 font-mono text-[10px] uppercase tracking-widest text-nexus-muted">
        <span>PUBLIC DIRECTORY ONLY • PRIVATE &amp; UNLISTED MATCHES REQUIRE A CODE</span>
        <span>
          {lastUpdated ? `UPDATED ${new Date(lastUpdated).toLocaleTimeString()}` : 'AWAITING SYNC'}
        </span>
      </div>

      <CodeEntryModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onResolved={(matchId, code) => {
          setIsCodeModalOpen(false);
          openMatch(matchId, code);
        }}
      />
    </div>
  );
};
