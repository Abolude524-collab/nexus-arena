import React, { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Eye, AlertCircle, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useSpectatorStore } from '../../store/spectatorStore';
import { useAuthPromptStore } from '../../store/authPromptStore';

interface SpectatorChatProps {
  isEnded: boolean;
}

/**
 * Spectator-only chat. Messages never reach players, and the server enforces
 * membership and rate limits before broadcasting. Guests read along but the
 * server refuses their messages, so the composer is replaced by a sign-in prompt.
 */
export const SpectatorChat: React.FC<SpectatorChatProps> = ({ isEnded }) => {
  const { chatMessages, sendChat, chatError, clearChatError, viewer } = useSpectatorStore();
  const requestAuth = useAuthPromptStore((state) => state.requestAuth);
  const [content, setContent] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Until the join response lands, treat the session as chat-less rather than
  // guessing from local auth state.
  const canChat = viewer?.canChat === true;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isEnded || !canChat) return;
    sendChat(trimmed);
    setContent('');
  };

  return (
    <div className="flex flex-col bg-nexus-surface border border-nexus-border rounded-card overflow-hidden">
      <div className="px-4 py-2.5 bg-nexus-card border-b border-nexus-border flex items-center justify-between font-heading text-[11px] font-bold uppercase tracking-wider text-white">
        <span className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-nexus-cyan" /> SPECTATOR CHAT
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-nexus-muted">
            <Eye className="w-3 h-3" /> OBSERVER ONLY
          </span>
          <button
            onClick={() => setIsCollapsed((value) => !value)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand spectator chat' : 'Collapse spectator chat'}
            className="p-1 rounded text-nexus-muted hover:text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </span>
      </div>

      {!isCollapsed && (
        <>
      <div className="flex-1 px-3 py-3 overflow-y-auto space-y-2 font-mono text-[11px] max-h-56 lg:max-h-72">
        {chatMessages.length === 0 ? (
          <div className="text-center text-nexus-muted py-6 italic leading-relaxed">
            No spectator messages yet.
            <br />
            Players cannot see this channel.
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-nexus-card/50 px-2.5 py-1.5 rounded border border-nexus-border/60 space-y-0.5"
            >
              <div className="flex items-center justify-between gap-2 text-[9px] text-nexus-muted uppercase tracking-wider">
                <span className="text-nexus-cyan font-bold truncate">{msg.senderName}</span>
                <span className="shrink-0">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-white break-words leading-relaxed">{msg.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {chatError && (
        <div className="mx-3 mb-2 flex items-start gap-2 px-2.5 py-1.5 rounded border border-nexus-warning/40 bg-nexus-warning/10 text-nexus-warning font-mono text-[10px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="flex-1 break-words">{chatError}</span>
          <button
            onClick={clearChatError}
            className="text-nexus-warning hover:text-white cursor-pointer"
            aria-label="Dismiss chat error"
          >
            ×
          </button>
        </div>
      )}

      {canChat ? (
        <form onSubmit={handleSend} className="p-2.5 bg-nexus-card/80 border-t border-nexus-border flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={300}
            disabled={isEnded}
            placeholder={isEnded ? 'MATCH ENDED' : 'Message spectators...'}
            className="flex-1 px-3 py-2 rounded-btn bg-nexus-bg border border-nexus-border text-white text-[11px] font-mono focus:outline-none focus:border-nexus-cyan disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!content.trim() || isEnded}
            className="px-3.5 py-2 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="p-2.5 bg-nexus-card/80 border-t border-nexus-border space-y-2">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-nexus-muted">
            <Lock className="w-3 h-3" /> READ-ONLY FOR GUESTS
          </div>
          <button
            type="button"
            onClick={() => requestAuth('chat')}
            className="w-full py-2 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" /> Sign in to join the conversation
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
};
