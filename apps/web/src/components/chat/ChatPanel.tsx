import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { ChatMessage } from '@nexus-arena/shared';
import { socketService } from '../../services/socket.service';

export const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('chat:message', handleMessage);

    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('chat:send', { content: content.trim() });
      setContent('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-nexus-surface border border-nexus-border rounded-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-nexus-card border-b border-nexus-border flex items-center justify-between font-heading text-xs font-bold uppercase tracking-wider text-white">
        <span className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-nexus-accent" /> ROOM CHAT
        </span>
        <span className="text-nexus-muted font-mono text-[10px]">{messages.length} MSG</span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs max-h-80">
        {messages.length === 0 ? (
          <div className="text-center text-nexus-muted py-8 italic">
            No messages yet. Say hi to the room!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-0.5">
              {msg.isSystem ? (
                <div className="text-nexus-cyan font-bold italic bg-nexus-cyan/10 px-2 py-1 rounded border border-nexus-cyan/20">
                  SYSTEM // {msg.content}
                </div>
              ) : (
                <div className="bg-nexus-card/40 p-2 rounded border border-nexus-border/60 space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-nexus-muted">
                    <span className="text-nexus-accent font-bold font-heading">{msg.senderName}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-white break-words">{msg.content}</div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-nexus-card/80 border-t border-nexus-border flex gap-2">
        <input
          type="text"
          placeholder="Message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 px-3 py-2 rounded-btn bg-nexus-bg border border-nexus-border text-white text-xs font-mono focus:outline-none focus:border-nexus-accent transition-colors"
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-2 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-40 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 glow-accent"
        >
          <Send className="w-3.5 h-3.5" /> SEND
        </button>
      </form>
    </div>
  );
};
