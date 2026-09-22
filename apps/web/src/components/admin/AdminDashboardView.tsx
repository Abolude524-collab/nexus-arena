import React, { useEffect, useState } from 'react';
import { Shield, Users, Gamepad2, Trophy, Loader2, Trash2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { RoomDTO } from '@nexus-arena/shared';

interface AdminMetrics {
  onlineUsers: number;
  activeRoomsCount: number;
  totalMatches: number;
  totalUsers: number;
  rooms: RoomDTO[];
  users: Array<{
    id: string;
    username: string;
    email: string;
    role: string;
    avatar: string;
    createdAt: string;
  }>;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const AdminDashboardView: React.FC = () => {
  const { token } = useAuthStore();
  const [data, setData] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation modal states
  const [confirmRoomDelete, setConfirmRoomDelete] = useState<{ id: string; name: string; code: string } | null>(null);
  const [confirmUserDelete, setConfirmUserDelete] = useState<{ id: string; username: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMetrics = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to load admin metrics');
      }
      setData(result);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [token]);

  const executeDeleteUser = async () => {
    if (!token || !confirmUserDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/admin/users/${confirmUserDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to delete user');
      }

      setConfirmUserDelete(null);
      fetchMetrics();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const executeDeleteRoom = async () => {
    if (!token || !confirmRoomDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`${SERVER_URL}/api/admin/rooms/${confirmRoomDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to terminate room');
      }

      setConfirmRoomDelete(null);
      fetchMetrics();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      {/* Admin Header */}
      <div className="flex items-center justify-between border-b border-nexus-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-accent/20 border border-nexus-accent/40 text-nexus-accent font-mono text-xs uppercase font-bold">
            <Shield className="w-4 h-4" /> SYSTEM CONTROL CENTER
          </div>
          <h1 className="font-heading text-4xl font-extrabold text-white tracking-wider mt-2">
            ADMIN DASHBOARD
          </h1>
          <p className="text-nexus-muted text-sm mt-0.5">
            Operational visibility, active room inspection, and user moderation
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-card bg-nexus-danger/10 border border-nexus-danger/40 flex items-center gap-3 text-nexus-danger font-mono text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-nexus-muted flex flex-col items-center justify-center gap-3 font-mono text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-nexus-accent" />
          <span>LOADING OPERATIONAL METRICS...</span>
        </div>
      ) : data ? (
        <>
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="bg-nexus-surface border border-nexus-border rounded-card p-5 space-y-1">
              <div className="text-xs text-nexus-muted uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-nexus-cyan" /> ONLINE PLAYERS
              </div>
              <div className="font-heading text-3xl font-extrabold text-nexus-cyan">
                {data.onlineUsers}
              </div>
            </div>

            <div className="bg-nexus-surface border border-nexus-border rounded-card p-5 space-y-1">
              <div className="text-xs text-nexus-muted uppercase flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-nexus-accent" /> ACTIVE ROOMS
              </div>
              <div className="font-heading text-3xl font-extrabold text-nexus-accent">
                {data.activeRoomsCount}
              </div>
            </div>

            <div className="bg-nexus-surface border border-nexus-border rounded-card p-5 space-y-1">
              <div className="text-xs text-nexus-muted uppercase flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> TOTAL MATCHES
              </div>
              <div className="font-heading text-3xl font-extrabold text-amber-400">
                {data.totalMatches}
              </div>
            </div>

            <div className="bg-nexus-surface border border-nexus-border rounded-card p-5 space-y-1">
              <div className="text-xs text-nexus-muted uppercase flex items-center gap-2">
                <Shield className="w-4 h-4 text-nexus-success" /> REGISTERED USERS
              </div>
              <div className="font-heading text-3xl font-extrabold text-white">
                {data.totalUsers}
              </div>
            </div>
          </div>

          {/* Active Rooms Inspector */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-white">
              ACTIVE ROOM INSPECTOR ({data.rooms.length})
            </h2>

            <div className="rounded-card bg-nexus-surface border border-nexus-border overflow-hidden">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="border-b border-nexus-border bg-nexus-card/50 text-xs text-nexus-muted uppercase">
                    <th className="py-3.5 px-6">ROOM NAME</th>
                    <th className="py-3.5 px-6">CODE</th>
                    <th className="py-3.5 px-6">PLAYERS</th>
                    <th className="py-3.5 px-6">STATUS</th>
                    <th className="py-3.5 px-6 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexus-border/40">
                  {data.rooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-nexus-muted italic">
                        No rooms active right now.
                      </td>
                    </tr>
                  ) : (
                    data.rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-nexus-card/30">
                        <td className="py-3.5 px-6 font-heading font-bold text-white">
                          {room.name}
                        </td>
                        <td className="py-3.5 px-6 text-nexus-cyan font-bold">{room.code}</td>
                        <td className="py-3.5 px-6">
                          {room.currentPlayers}/{room.maxPlayers}
                        </td>
                        <td className="py-3.5 px-6">
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
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => setConfirmRoomDelete({ id: room.id, name: room.name, code: room.code })}
                            className="px-3 py-1.5 rounded-btn bg-nexus-card hover:bg-nexus-danger/20 border border-nexus-border hover:border-nexus-danger/40 text-nexus-muted hover:text-nexus-danger font-heading text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                            title="Terminate Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> CLOSE ROOM
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Moderation Management */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-white">
              USER MANAGEMENT & MODERATION ({data.users.length})
            </h2>

            <div className="rounded-card bg-nexus-surface border border-nexus-border overflow-hidden">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="border-b border-nexus-border bg-nexus-card/50 text-xs text-nexus-muted uppercase">
                    <th className="py-3.5 px-6">USERNAME</th>
                    <th className="py-3.5 px-6">EMAIL</th>
                    <th className="py-3.5 px-6">ROLE</th>
                    <th className="py-3.5 px-6 text-right">MODERATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nexus-border/40">
                  {data.users.map((u) => (
                    <tr key={u.id} className="hover:bg-nexus-card/30">
                      <td className="py-3.5 px-6 font-heading font-bold text-white">
                        {u.username}
                      </td>
                      <td className="py-3.5 px-6 text-nexus-muted">{u.email}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                            u.role === 'ADMIN'
                              ? 'bg-nexus-accent/20 text-nexus-accent border border-nexus-accent/40'
                              : 'bg-nexus-card text-nexus-muted'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => setConfirmUserDelete({ id: u.id, username: u.username })}
                            className="p-2 rounded-btn bg-nexus-card hover:bg-nexus-danger/20 border border-nexus-border hover:border-nexus-danger/40 text-nexus-muted hover:text-nexus-danger transition-colors cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Confirmation Modal Layer for Room Deletion */}
      {confirmRoomDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-nexus-card border-2 border-nexus-danger rounded-card p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-nexus-danger">
              <ShieldAlert className="w-7 h-7" />
              <h3 className="font-heading text-xl font-extrabold uppercase tracking-wider text-white">
                CONFIRM ROOM TERMINATION
              </h3>
            </div>
            <p className="text-nexus-muted text-sm font-mono leading-relaxed">
              Are you sure you want to terminate room <strong className="text-white">{confirmRoomDelete.name}</strong> (<span className="text-nexus-cyan font-bold">{confirmRoomDelete.code}</span>)?
              <br /><br />
              This will immediately disconnect all participating players and close the arena instance.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setConfirmRoomDelete(null)}
                className="px-4 py-2 rounded-btn bg-nexus-surface border border-nexus-border text-white hover:bg-nexus-card font-heading text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                disabled={isDeleting}
                onClick={executeDeleteRoom}
                className="px-5 py-2 rounded-btn bg-nexus-danger hover:bg-nexus-danger/90 text-white font-heading text-xs font-bold uppercase transition-all glow-danger cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                TERMINATE ROOM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Layer for User Deletion */}
      {confirmUserDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-nexus-card border-2 border-nexus-danger rounded-card p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-nexus-danger">
              <ShieldAlert className="w-7 h-7" />
              <h3 className="font-heading text-xl font-extrabold uppercase tracking-wider text-white">
                CONFIRM USER DELETION
              </h3>
            </div>
            <p className="text-nexus-muted text-sm font-mono leading-relaxed">
              Are you sure you want to permanently delete account <strong className="text-white">{confirmUserDelete.username}</strong>?
              <br /><br />
              All player statistics, match history, and progression records for this user will be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setConfirmUserDelete(null)}
                className="px-4 py-2 rounded-btn bg-nexus-surface border border-nexus-border text-white hover:bg-nexus-card font-heading text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                disabled={isDeleting}
                onClick={executeDeleteUser}
                className="px-5 py-2 rounded-btn bg-nexus-danger hover:bg-nexus-danger/90 text-white font-heading text-xs font-bold uppercase transition-all glow-danger cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                DELETE USER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

