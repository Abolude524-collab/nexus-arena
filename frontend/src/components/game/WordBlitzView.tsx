import React, { useState, useEffect } from 'react';
import { Type, Clock, Trophy, CheckCircle2, XCircle, Send } from 'lucide-react';
import { WordBlitzGameState } from '../../shared/index.js';
import { socketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';

interface WordBlitzViewProps {
  gameState: WordBlitzGameState;
}

export const WordBlitzView: React.FC<WordBlitzViewProps> = ({ gameState }) => {
  const { user } = useAuthStore();
  const myPlayer = gameState.players.find((p) => p.id === user?.id);

  const [inputAnswer, setInputAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Reset input on new round
  useEffect(() => {
    setInputAnswer('');
    setSubmitted(false);
  }, [gameState.currentRound]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputAnswer.trim() || submitted || gameState.status !== 'ROUND_ACTIVE') return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('word:submit', {
      roundId: gameState.currentRound,
      answer: inputAnswer.trim(),
    });

    setSubmitted(true);
  };

  const now = Date.now();
  const remainingMs = Math.max(0, gameState.endsAt - now);
  const remainingSecs = Math.ceil(remainingMs / 1000);
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / 10000) * 100));

  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 bg-nexus-bg flex flex-col justify-between p-4 overflow-hidden selection:bg-none font-sans">
      {/* Top HUD */}
      <div className="flex items-center justify-between bg-nexus-surface/90 border border-nexus-border backdrop-blur px-6 py-3 rounded-card z-10">
        <div className="flex items-center gap-6">
          <div className="font-heading font-extrabold text-xl text-white tracking-wider flex items-center gap-2">
            <Type className="w-6 h-6 text-nexus-cyan animate-pulse" />
            <span className="text-nexus-cyan">WORD</span> BLITZ
          </div>
          <div className="flex items-center gap-2 font-mono text-sm bg-nexus-card px-3 py-1.5 rounded-btn border border-nexus-border">
            <Clock className="w-4 h-4 text-nexus-cyan" />
            <span className="text-nexus-muted">ROUND:</span>
            <span className="text-white font-bold">{gameState.currentRound} / {gameState.totalRounds}</span>
          </div>
        </div>

        {/* Player Score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-nexus-card px-5 py-1.5 rounded-btn border border-nexus-accent glow-accent font-mono">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-nexus-muted text-xs">YOUR SCORE:</span>
            <span className="text-white font-heading font-extrabold text-2xl">
              {myPlayer?.score || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Challenge & Typing Arena */}
      <div className="flex-1 relative flex items-center justify-center my-2 rounded-card border-2 border-nexus-border bg-nexus-surface/40 p-6 shadow-2xl">
        <div className="w-full max-w-xl space-y-6 text-center z-10">
          {/* Countdown Progress Bar */}
          <div className="w-full h-2 rounded-full bg-nexus-card overflow-hidden border border-nexus-border">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-full transition-all duration-200 ${
                remainingSecs <= 3 ? 'bg-nexus-danger' : 'bg-nexus-cyan'
              }`}
            />
          </div>

          {/* Challenge Prompt Box */}
          <div className="p-4 sm:p-8 rounded-card bg-nexus-card border-2 border-nexus-border space-y-2 sm:space-y-3 shadow-2xl">
            <div className="font-mono text-[10px] sm:text-xs text-nexus-muted uppercase tracking-widest">
              TYPE THE WORD
            </div>
            <div className="font-heading font-extrabold text-3xl sm:text-5xl md:text-6xl text-white tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-nexus-accent via-nexus-cyan to-white break-all">
              {gameState.challenge?.prompt || 'WAITING...'}
            </div>
          </div>

          {/* Input & Submission Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <input
              type="text"
              autoFocus
              disabled={submitted || gameState.status !== 'ROUND_ACTIVE'}
              placeholder={
                submitted
                  ? 'ANSWER SUBMITTED...'
                  : gameState.status === 'ROUND_ACTIVE'
                  ? 'TYPE YOUR ANSWER HERE...'
                  : 'GET READY FOR NEXT ROUND...'
              }
              value={inputAnswer}
              onChange={(e) => setInputAnswer(e.target.value)}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-btn bg-nexus-surface border border-nexus-border text-white text-base sm:text-lg font-mono tracking-wider focus:outline-none focus:border-nexus-accent disabled:opacity-50 uppercase shadow-inner"
            />
            <button
              type="submit"
              disabled={submitted || !inputAnswer.trim() || gameState.status !== 'ROUND_ACTIVE'}
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 disabled:opacity-40 text-white font-heading font-bold text-sm sm:text-base uppercase tracking-wider transition-all glow-accent flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" /> SUBMIT
            </button>
          </form>

          {/* Feedback Display */}
          {myPlayer?.lastResult && (
            <div className="pt-2 animate-fade-in">
              {myPlayer.lastResult.isCorrect ? (
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-nexus-success/20 border border-nexus-success text-nexus-success font-heading font-bold text-lg uppercase">
                  <CheckCircle2 className="w-5 h-5" /> CORRECT! +{myPlayer.lastResult.scoreEarned} PTS ({myPlayer.lastResult.reactionMs}ms)
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-nexus-danger/20 border border-nexus-danger text-nexus-danger font-heading font-bold text-lg uppercase">
                  <XCircle className="w-5 h-5" /> INCORRECT
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side Scoreboard */}
        <div className="absolute top-4 right-4 bg-nexus-surface/80 border border-nexus-border backdrop-blur rounded-btn p-3 font-mono text-xs space-y-2 min-w-[170px]">
          <div className="text-[10px] text-nexus-muted uppercase font-heading font-bold border-b border-nexus-border pb-1">
            TYPING SCOREBOARD
          </div>
          {sortedPlayers.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="text-nexus-muted truncate max-w-[90px]">#{idx + 1} {p.username}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-nexus-muted">({p.correctCount}/10)</span>
                <span className="font-bold text-nexus-cyan">{p.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom HUD Hint */}
      <div className="flex items-center justify-center bg-nexus-surface/80 border border-nexus-border px-6 py-2 rounded-btn font-mono text-xs text-nexus-muted">
        <span>SCORING: <strong className="text-nexus-cyan">CORRECT (+100)</strong> • <strong className="text-amber-400">&lt; 1s (+100)</strong> • <strong className="text-nexus-accent">FIRST (+50)</strong></span>
      </div>
    </div>
  );
};
