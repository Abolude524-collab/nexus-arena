import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, PlayCircle, X } from 'lucide-react';
import { MatchLiveNotification } from '../../shared/index.js';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket.service';

// Alerts are a registered perk; they arrive on the follower's own channel only.
const AUTO_DISMISS_MS = 12_000;
const MAX_VISIBLE = 3;

export const MatchLiveNotifications: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const [alerts, setAlerts] = useState<MatchLiveNotification[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAlerts([]);
      return;
    }

    // Alerts ride the follower's own authenticated session, so the token is passed
    // explicitly rather than relying on whatever identity the channel holds.
    const socket = socketService.connect(token);
    const handleMatchLive = (payload: MatchLiveNotification) => {
      if (!payload?.roomId) return;
      setAlerts((previous) => {
        if (previous.some((entry) => entry.roomId === payload.roomId)) return previous;
        return [...previous, payload].slice(-MAX_VISIBLE);
      });
    };

    socket.on('notification:match_live', handleMatchLive);
    return () => {
      socket.off('notification:match_live', handleMatchLive);
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setTimeout(() => {
      setAlerts((previous) => previous.slice(1));
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [alerts]);

  if (!isAuthenticated || alerts.length === 0) return null;

  const dismiss = (roomId: string) =>
    setAlerts((previous) => previous.filter((entry) => entry.roomId !== roomId));

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
      {alerts.map((alert) => (
        <div
          key={alert.roomId}
          className="rounded-card bg-nexus-surface border border-nexus-accent/50 shadow-2xl px-3.5 py-3 space-y-2 animate-fade-in"
          role="status"
        >
          <div className="flex items-start gap-2">
            <BellRing className="w-4 h-4 text-nexus-accent shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-[11px] font-bold uppercase tracking-wider text-white truncate">
                {alert.playerName} IS LIVE
              </p>
              <p className="font-mono text-[10px] text-nexus-muted truncate">
                {alert.roomName} • {alert.gameType}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(alert.roomId)}
              aria-label="Dismiss live match alert"
              className="min-w-6 min-h-6 -mr-1 flex items-center justify-center rounded text-nexus-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              dismiss(alert.roomId);
              navigate(`/watch/${alert.roomId}`);
            }}
            className="w-full py-1.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlayCircle className="w-3.5 h-3.5" /> WATCH MATCH
          </button>
        </div>
      ))}
    </div>
  );
};
