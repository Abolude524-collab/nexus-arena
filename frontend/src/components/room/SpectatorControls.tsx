import React, { useEffect, useState } from 'react';
import { Copy, Check, Eye, EyeOff, Link2, KeyRound, RefreshCw, Users, Globe, Lock } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket.service';

const SPECTATOR_LIMITS = [10, 25, 50, 100, 200];

/**
 * Host-only spectator controls. Visibility and the access code are enforced by
 * the server; this panel only requests changes and displays granted state.
 */
export const SpectatorControls: React.FC = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();

  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isHost = Boolean(currentRoom && user && currentRoom.hostId === user.id);
  const needsCode = Boolean(currentRoom && currentRoom.visibility !== 'PUBLIC');
  const roomId = currentRoom?.id;

  const watchLink = currentRoom
    ? `${window.location.origin}/watch/${currentRoom.id}${
        needsCode && accessCode ? `?code=${accessCode}` : ''
      }`
    : '';

  useEffect(() => {
    if (!isHost || !needsCode || !roomId) {
      setAccessCode(null);
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('room:spectator_code', {}, (response) => {
      if (response?.success && response.code) {
        setAccessCode(response.code);
        setError(null);
      } else {
        setError(response?.error || 'Unable to load the spectator code');
      }
    });
  }, [isHost, needsCode, roomId]);

  if (!isHost || !currentRoom) return null;

  const updateSettings = (payload: { allowSpectators?: boolean; spectatorLimit?: number }) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('room:spectator_settings', payload);
  };

  const rotateCode = () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('room:spectator_code', { rotate: true }, (response) => {
      if (response?.success && response.code) {
        setAccessCode(response.code);
        setError(null);
      } else {
        setError(response?.error || 'Unable to rotate the spectator code');
      }
    });
  };

  const copy = (value: string, kind: 'code' | 'link') => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const VisibilityIcon = currentRoom.visibility === 'PUBLIC' ? Globe : Lock;

  return (
    <div className="bg-nexus-surface border border-nexus-border rounded-card overflow-hidden">
      <div className="px-4 py-3 bg-nexus-card border-b border-nexus-border flex items-center justify-between">
        <span className="font-heading text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-nexus-cyan" /> SPECTATOR ACCESS
        </span>
        <span className="font-mono text-[10px] text-nexus-muted flex items-center gap-1">
          <VisibilityIcon className="w-3 h-3" /> {currentRoom.visibility}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">
              {currentRoom.allowSpectators ? 'Spectating enabled' : 'Spectating disabled'}
            </div>
            <div className="text-[11px] text-nexus-muted font-mono">
              {currentRoom.allowSpectators
                ? 'Observers cannot play or affect scores'
                : 'No one can watch this match'}
            </div>
          </div>
          <button
            onClick={() => updateSettings({ allowSpectators: !currentRoom.allowSpectators })}
            className={`shrink-0 px-3 py-1.5 rounded-btn border font-heading text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              currentRoom.allowSpectators
                ? 'bg-nexus-success/15 border-nexus-success/50 text-nexus-success hover:bg-nexus-success/25'
                : 'bg-nexus-card border-nexus-border text-nexus-muted hover:text-white'
            }`}
          >
            {currentRoom.allowSpectators ? (
              <>
                <Eye className="w-3.5 h-3.5" /> ON
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" /> OFF
              </>
            )}
          </button>
        </div>

        {currentRoom.allowSpectators && (
          <>
            {/* Capacity */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[11px] text-nexus-muted">
                <Users className="w-3.5 h-3.5 text-nexus-accent" />
                <span>
                  <span className="text-white font-bold">{currentRoom.spectatorCount}</span> /{' '}
                  {currentRoom.spectatorLimit} WATCHING
                </span>
              </div>
              <select
                value={SPECTATOR_LIMITS.includes(currentRoom.spectatorLimit) ? currentRoom.spectatorLimit : 50}
                onChange={(e) => updateSettings({ spectatorLimit: parseInt(e.target.value, 10) })}
                className="px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border text-white font-mono text-[11px] focus:outline-none focus:border-nexus-accent cursor-pointer"
                aria-label="Spectator limit"
              >
                {SPECTATOR_LIMITS.map((limit) => (
                  <option key={limit} value={limit}>
                    LIMIT {limit}
                  </option>
                ))}
              </select>
            </div>

            {/* Access code for private / unlisted matches */}
            {needsCode && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3" /> SPECTATOR ACCESS CODE
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-btn bg-nexus-card border border-nexus-border font-mono text-sm min-w-0">
                    <span className="text-nexus-cyan font-bold tracking-[0.2em] truncate">
                      {accessCode || '— — — —'}
                    </span>
                    <button
                      onClick={() => accessCode && copy(accessCode, 'code')}
                      disabled={!accessCode}
                      className="ml-auto text-nexus-muted hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                      title="Copy access code"
                      aria-label="Copy spectator access code"
                    >
                      {copied === 'code' ? (
                        <Check className="w-4 h-4 text-nexus-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={rotateCode}
                    className="p-2 rounded-btn bg-nexus-card border border-nexus-border text-nexus-muted hover:text-white hover:border-nexus-accent transition-colors cursor-pointer"
                    title="Rotate access code (invalidates the old one)"
                    aria-label="Rotate spectator access code"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] font-mono text-nexus-muted leading-relaxed">
                  Rotating invalidates every previously shared code.
                </p>
              </div>
            )}

            {/* Watch link */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-nexus-muted uppercase tracking-widest flex items-center gap-1.5">
                <Link2 className="w-3 h-3" /> WATCH LINK
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={currentRoom.status === 'PLAYING' ? watchLink : `${window.location.origin}/watch`}
                  className="flex-1 min-w-0 px-3 py-2 rounded-btn bg-nexus-card border border-nexus-border font-mono text-[10px] text-nexus-muted focus:outline-none"
                  aria-label="Spectator watch link"
                />
                <button
                  onClick={() => copy(watchLink, 'link')}
                  disabled={currentRoom.status !== 'PLAYING'}
                  className="p-2 rounded-btn bg-nexus-card border border-nexus-border text-nexus-muted hover:text-white hover:border-nexus-cyan transition-colors disabled:opacity-40 cursor-pointer"
                  title="Copy watch link"
                  aria-label="Copy spectator watch link"
                >
                  {copied === 'link' ? (
                    <Check className="w-4 h-4 text-nexus-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {currentRoom.status !== 'PLAYING' && (
                <p className="text-[10px] font-mono text-nexus-muted leading-relaxed">
                  The link activates once the match starts.
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="text-[10px] font-mono text-nexus-danger leading-relaxed">{error}</p>
        )}
      </div>
    </div>
  );
};
