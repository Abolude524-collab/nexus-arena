import React, { useState } from 'react';
import { Search, Plus, Users, Lock, Gamepad2, ArrowRight, Hash } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { CreateRoomModal } from '../room/CreateRoomModal';
import { JoinRoomModal } from '../room/JoinRoomModal';

export const LobbyView: React.FC = () => {
  const { rooms, onlinePlayersCount, joinRoom } = useRoomStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const filteredRooms = rooms.filter(
    (r) =>
      r.status !== 'FINISHED' &&
      r.status !== 'CLOSED' &&
      (r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleJoin = async (roomIdOrCode: string, _isPrivate: boolean) => {
    try {
      await joinRoom(roomIdOrCode, passwordInput);
      setPasswordInput('');
    } catch (_err) {
      // Handled in store
    }
  };

  const handleOpenJoinModal = (code: string = '') => {
    setJoinCodeInput(code);
    setIsJoinModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      {/* Lobby Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-nexus-border pb-6">
        <div>
          <h1 className="font-heading text-4xl font-extrabold text-white tracking-wider">
            ARENA LOBBY
          </h1>
          <p className="text-nexus-muted text-sm mt-1">
            Browse public match rooms or create a custom private arena.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-btn bg-nexus-surface border border-nexus-border font-mono text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-nexus-success animate-pulse"></span>
            <span className="text-nexus-muted uppercase">ONLINE PLAYERS:</span>
            <span className="text-white font-bold">{onlinePlayersCount.toLocaleString()}</span>
          </div>

          <button
            onClick={() => handleOpenJoinModal()}
            className="px-5 py-3 rounded-btn bg-nexus-card hover:bg-nexus-surface border border-nexus-cyan/40 text-nexus-cyan font-heading font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 glow-cyan"
          >
            <Hash className="w-4 h-4" /> JOIN BY CODE
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all glow-accent flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> CREATE ROOM
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-nexus-muted" />
          <input
            type="text"
            placeholder="SEARCH ROOMS BY NAME OR PASTE ROOM CODE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim()) {
                handleOpenJoinModal(searchTerm.trim());
              }
            }}
            className="w-full pl-12 pr-4 py-3 rounded-btn bg-nexus-surface border border-nexus-border text-white text-sm focus:outline-none focus:border-nexus-accent font-mono transition-colors uppercase"
          />
        </div>
      </div>

      {/* Room Table */}
      <div className="rounded-card bg-nexus-surface border border-nexus-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-nexus-border bg-nexus-card/50 font-heading text-xs uppercase tracking-wider text-nexus-muted">
                <th className="py-4 px-6">ROOM NAME</th>
                <th className="py-4 px-6">GAME</th>
                <th className="py-4 px-6">PLAYERS</th>
                <th className="py-4 px-6">STATUS</th>
                <th className="py-4 px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border/40 font-mono text-sm">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-nexus-muted">
                    <div className="space-y-4">
                      <Gamepad2 className="w-10 h-10 mx-auto text-nexus-muted/60" />
                      <div className="space-y-1">
                        <div className="font-heading font-bold text-white text-base uppercase">
                          NO ACTIVE ROOMS FOUND
                        </div>
                        <div className="text-xs max-w-sm mx-auto">
                          Be the first player to create a room or join directly using a room code.
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-4 pt-2">
                        <button
                          onClick={() => handleOpenJoinModal(searchTerm.trim())}
                          className="px-5 py-2.5 rounded-btn bg-nexus-card hover:bg-nexus-surface border border-nexus-cyan/40 text-nexus-cyan font-heading text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-2"
                        >
                          <Hash className="w-4 h-4" /> JOIN WITH CODE
                        </button>
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="px-5 py-2.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-2 glow-accent"
                        >
                          <Plus className="w-4 h-4" /> CREATE ROOM
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-nexus-card/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {room.isPrivate && <Lock className="w-4 h-4 text-nexus-warning" />}
                        <span className="font-bold text-white font-heading">{room.name}</span>
                        <span className="text-xs text-nexus-muted">({room.code})</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-nexus-cyan font-semibold">{room.gameType}</td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1.5 text-white">
                        <Users className="w-4 h-4 text-nexus-muted" />
                        {room.currentPlayers}/{room.maxPlayers}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          room.status === 'WAITING'
                            ? 'bg-nexus-success/15 text-nexus-success border border-nexus-success/30'
                            : room.status === 'PLAYING'
                            ? 'bg-nexus-warning/15 text-nexus-warning border border-nexus-warning/30'
                            : 'bg-nexus-muted/15 text-nexus-muted border border-nexus-muted/30'
                        }`}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleJoin(room.id, room.isPrivate)}
                        disabled={room.currentPlayers >= room.maxPlayers || room.status !== 'WAITING'}
                        className="px-5 py-2 rounded-btn bg-nexus-card hover:bg-nexus-accent text-white font-heading text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 inline-flex items-center gap-2"
                      >
                        {room.status === 'FINISHED' ? (
                          'FINISHED'
                        ) : room.status === 'PLAYING' ? (
                          'IN GAME'
                        ) : room.currentPlayers >= room.maxPlayers ? (
                          'FULL'
                        ) : (
                          <>
                            JOIN <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        initialCode={joinCodeInput}
      />
    </div>
  );
};
