import React, { useEffect, useState } from 'react';
import { Check, Eye, Link2 } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/socket.service';

/**
 * Compact host-only affordance rendered over a live match. The waiting-room panel
 * unmounts once the game starts, so the host needs a way to share the watch link
 * while the match is actually watchable.
 */
export const HostWatchShare: React.FC = () => {
  const { currentRoom } = useRoomStore();
  const { user } = useAuthStore();

  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isHost = Boolean(currentRoom && user && currentRoom.hostId === user.id);
  const needsCode = Boolean(currentRoom && currentRoom.visibility !== 'PUBLIC');
  const roomId = currentRoom?.id;

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
      }
    });
  }, [isHost, needsCode, roomId]);

  if (!currentRoom || !isHost || !currentRoom.allowSpectators) return null;

  const watchLink = `${window.location.origin}/watch/${currentRoom.id}${
    needsCode && accessCode ? `?code=${accessCode}` : ''
  }`;

  const copyLink = () => {
    navigator.clipboard.writeText(watchLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-1.5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full bg-nexus-surface/95 border border-nexus-border backdrop-blur shadow-xl font-mono text-[9px] sm:text-[10px] max-w-[94vw]">
      <Eye className="w-3 h-3 shrink-0 text-nexus-accent" />
      <span className="text-nexus-muted whitespace-nowrap shrink-0">
        <span className="text-white font-bold">{currentRoom.spectatorCount}</span>
        <span className="text-nexus-muted">/{currentRoom.spectatorLimit}</span> WATCHING
      </span>
      <button
        onClick={copyLink}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-nexus-card border border-nexus-border hover:border-nexus-cyan text-white uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        title="Copy the spectator watch link"
        aria-label="Copy the spectator watch link"
      >
        {copied ? (
          <Check className="w-3 h-3 text-nexus-success" />
        ) : (
          <Link2 className="w-3 h-3" />
        )}
        <span className="hidden sm:inline">{copied ? 'COPIED' : 'SHARE WATCH'}</span>
      </button>
    </div>
  );
};
