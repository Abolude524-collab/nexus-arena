import React, { useEffect, useState } from 'react';
import { Gamepad2, Zap, Users, Trophy, Github, LogOut, Shield, Target, Type, ArrowRight, Menu, X, User } from 'lucide-react';
import { LevelUpPayload } from './shared/index.js';
import { useAuthStore } from './store/authStore';
import { useRoomStore } from './store/roomStore';
import { useGameStore } from './store/gameStore';
import { socketService } from './services/socket.service';
import { AuthModal } from './components/auth/AuthModal';
import { LobbyView } from './components/lobby/LobbyView';
import { WaitingRoomView } from './components/room/WaitingRoomView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { ProfileView } from './components/profile/ProfileView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { LevelUpModal } from './components/progression/LevelUpModal';

type ViewMode = 'landing' | 'lobby' | 'leaderboard' | 'profile' | 'admin';

export const App: React.FC = () => {
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const { currentRoom, initSocketListeners, fetchRooms, restoreMyRoom } = useRoomStore();
  const { initGameSocketListeners } = useGameStore();

  const [activeView, setActiveView] = useState<ViewMode>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'lobby' || hash === 'leaderboard' || hash === 'profile' || hash === 'admin') {
      return hash as ViewMode;
    }
    return 'landing';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [levelUpPayload, setLevelUpPayload] = useState<LevelUpPayload | null>(null);

  const navigateTo = (view: ViewMode) => {
    setActiveView(view);
    window.location.hash = view;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (
        hash === 'lobby' ||
        hash === 'leaderboard' ||
        hash === 'profile' ||
        hash === 'admin' ||
        hash === 'landing'
      ) {
        setActiveView(hash as ViewMode);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (isAuthenticated) {
      initSocketListeners();
      initGameSocketListeners();
      restoreMyRoom();

      const socket = socketService.getSocket();
      if (socket) {
        const handleLevelUp = (payload: LevelUpPayload) => {
          setLevelUpPayload(payload);
        };
        socket.on('progression:level-up', handleLevelUp);
        return () => {
          socket.off('progression:level-up', handleLevelUp);
        };
      }
    }
  }, [isAuthenticated, initSocketListeners, initGameSocketListeners, restoreMyRoom]);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text flex flex-col font-sans selection:bg-nexus-accent selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-nexus-border bg-nexus-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => {
              navigateTo('landing');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-btn bg-nexus-accent/20 border border-nexus-accent flex items-center justify-center glow-accent group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-nexus-accent" />
            </div>
            <span className="font-heading font-extrabold text-xl tracking-wider text-white">
              NEXUS <span className="text-nexus-cyan">ARENA</span>
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 font-heading text-sm uppercase tracking-wider text-nexus-muted">
            <button
              onClick={() => navigateTo(isAuthenticated ? 'lobby' : 'landing')}
              className={`transition-colors hover:text-nexus-cyan cursor-pointer ${
                activeView === 'lobby' || activeView === 'landing' ? 'text-white font-bold' : ''
              }`}
            >
              PLAY
            </button>
            <button
              onClick={() => navigateTo('leaderboard')}
              className={`transition-colors hover:text-nexus-cyan cursor-pointer ${
                activeView === 'leaderboard' ? 'text-white font-bold' : ''
              }`}
            >
              LEADERBOARD
            </button>
            {isAuthenticated && (
              <button
                onClick={() => navigateTo('profile')}
                className={`transition-colors hover:text-nexus-cyan cursor-pointer ${
                  activeView === 'profile' ? 'text-white font-bold' : ''
                }`}
              >
                PROFILE
              </button>
            )}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <button
                onClick={() => navigateTo('admin')}
                className={`transition-colors text-nexus-accent hover:text-white cursor-pointer flex items-center gap-1.5 font-bold ${
                  activeView === 'admin' ? 'text-white underline' : ''
                }`}
              >
                <Shield className="w-4 h-4" /> ADMIN
              </button>
            )}
          </nav>

          {/* Right Action Controls (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {!isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openAuth('login')}
                  className="px-4 py-2 rounded-btn bg-nexus-card border border-nexus-border hover:bg-nexus-surface text-white font-heading text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="px-5 py-2 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all glow-accent cursor-pointer"
                >
                  Register
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateTo('profile')}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-btn bg-nexus-card border border-nexus-border hover:border-nexus-accent transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-nexus-accent text-white font-heading font-bold text-xs flex items-center justify-center uppercase">
                    {user?.username.substring(0, 2)}
                  </div>
                  <span className="font-heading font-bold text-sm text-white">{user?.username}</span>
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-btn text-nexus-muted hover:text-nexus-danger hover:bg-nexus-card transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Controls & Hamburger Toggle Button */}
          <div className="flex items-center gap-3 md:hidden">
            {isAuthenticated && user && (
              <button
                onClick={() => {
                  navigateTo('profile');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-btn bg-nexus-card border border-nexus-border text-white cursor-pointer hover:border-nexus-accent transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-nexus-accent text-white font-heading font-bold text-[10px] flex items-center justify-center uppercase">
                  {user.username.substring(0, 2)}
                </div>
                <span className="font-heading font-bold text-xs truncate max-w-[80px]">
                  {user.username}
                </span>
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-btn bg-nexus-card border border-nexus-border text-white hover:bg-nexus-surface hover:border-nexus-accent transition-colors cursor-pointer"
              aria-label="Toggle Mobile Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-[280px] sm:w-[320px] bg-nexus-surface border-l border-nexus-border z-50 flex flex-col justify-between p-6 shadow-2xl md:hidden animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-nexus-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-btn bg-nexus-accent/20 border border-nexus-accent flex items-center justify-center glow-accent">
                    <Zap className="w-4 h-4 text-nexus-accent" />
                  </div>
                  <span className="font-heading font-extrabold text-lg tracking-wider text-white">
                    NEXUS <span className="text-nexus-cyan">ARENA</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-btn text-nexus-muted hover:text-white hover:bg-nexus-card transition-colors cursor-pointer"
                  aria-label="Close Mobile Navigation Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col gap-3 font-heading uppercase tracking-wider text-sm">
                <button
                  onClick={() => {
                    navigateTo(isAuthenticated ? 'lobby' : 'landing');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-btn transition-all text-left cursor-pointer ${
                    activeView === 'lobby' || activeView === 'landing'
                      ? 'bg-nexus-accent text-white font-bold glow-accent'
                      : 'text-nexus-muted hover:text-white hover:bg-nexus-card'
                  }`}
                >
                  <Gamepad2 className="w-5 h-5" />
                  PLAY / LOBBY
                </button>

                <button
                  onClick={() => {
                    navigateTo('leaderboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-btn transition-all text-left cursor-pointer ${
                    activeView === 'leaderboard'
                      ? 'bg-nexus-accent text-white font-bold glow-accent'
                      : 'text-nexus-muted hover:text-white hover:bg-nexus-card'
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                  LEADERBOARD
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      navigateTo('profile');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-btn transition-all text-left cursor-pointer ${
                      activeView === 'profile'
                        ? 'bg-nexus-accent text-white font-bold glow-accent'
                        : 'text-nexus-muted hover:text-white hover:bg-nexus-card'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    MY PROFILE
                  </button>
                )}

                {isAuthenticated && user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      navigateTo('admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-btn transition-all text-left cursor-pointer ${
                      activeView === 'admin'
                        ? 'bg-nexus-accent text-white font-bold glow-accent'
                        : 'text-nexus-accent hover:text-white hover:bg-nexus-card'
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                    ADMIN DASHBOARD
                  </button>
                )}
              </nav>
            </div>

            {/* Drawer Footer / Auth section */}
            <div className="pt-6 border-t border-nexus-border">
              {isAuthenticated ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-card bg-nexus-card border border-nexus-border">
                    <div className="w-10 h-10 rounded-full bg-nexus-accent text-white font-heading font-bold text-sm flex items-center justify-center uppercase">
                      {user?.username.substring(0, 2)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-heading font-bold text-white text-sm truncate">
                        {user?.username}
                      </span>
                      <span className="text-nexus-muted text-xs truncate">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-btn bg-nexus-card border border-nexus-border hover:border-nexus-danger hover:text-nexus-danger text-nexus-muted font-heading text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      openAuth('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-btn bg-nexus-card border border-nexus-border hover:bg-nexus-surface text-white font-heading text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      openAuth('register');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading text-xs font-bold uppercase tracking-wider transition-all glow-accent cursor-pointer text-center"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {currentRoom ? (
          <WaitingRoomView />
        ) : activeView === 'lobby' && isAuthenticated ? (
          <LobbyView />
        ) : activeView === 'leaderboard' ? (
          <LeaderboardView />
        ) : activeView === 'profile' && isAuthenticated ? (
          <ProfileView />
        ) : activeView === 'admin' && isAuthenticated && user?.role === 'ADMIN' ? (
          <AdminDashboardView />
        ) : (
          /* Landing Hero Page */
          <div className="flex flex-col min-h-[calc(100vh-4rem)] justify-between">
            <div className="max-w-7xl mx-auto px-6 py-16 w-full my-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nexus-card border border-nexus-border text-nexus-cyan font-mono text-xs uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-nexus-cyan animate-pulse"></span>
                    Real-Time Multiplayer Platform v1.0
                  </div>

                  <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold leading-none tracking-tight">
                    REAL-TIME <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexus-accent via-nexus-cyan to-white">
                      MULTIPLAYER
                    </span> <br />
                    ENTER THE ARENA.
                  </h1>

                  <p className="text-nexus-muted text-lg max-w-lg leading-relaxed">
                    Fast-paced top-down multiplayer battlegrounds powered by server-authoritative physics, instant real-time synchronization, and competitive rankings.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-4">
                    <button
                      onClick={() => {
                        if (isAuthenticated) {
                          navigateTo('lobby');
                        } else {
                          openAuth('register');
                        }
                      }}
                      className="px-8 py-3.5 rounded-btn bg-nexus-accent hover:bg-nexus-accent/90 text-white font-heading font-bold text-base uppercase tracking-wider transition-all glow-accent flex items-center gap-3 cursor-pointer"
                    >
                      <Gamepad2 className="w-5 h-5" />
                      {isAuthenticated ? 'ENTER LOBBY' : 'PLAY NOW'}
                    </button>
                    <a
                      href="https://github.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-8 py-3.5 rounded-btn bg-nexus-card hover:bg-nexus-surface border border-nexus-border text-white font-heading font-semibold text-base uppercase tracking-wider transition-all flex items-center gap-3"
                    >
                      <Github className="w-5 h-5" />
                      EXPLORE GITHUB
                    </a>
                  </div>
                </div>

                {/* Arena Graphic Preview */}
                <div className="relative">
                  <div className="absolute -inset-1 rounded-card bg-gradient-to-r from-nexus-accent to-nexus-cyan opacity-30 blur-xl"></div>
                  <div className="relative rounded-card bg-nexus-surface border border-nexus-border p-6 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-nexus-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-nexus-danger"></div>
                        <div className="w-3 h-3 rounded-full bg-nexus-warning"></div>
                        <div className="w-3 h-3 rounded-full bg-nexus-success"></div>
                        <span className="font-mono text-xs text-nexus-muted ml-2">ARENA // NEON DASH</span>
                      </div>
                      <div className="font-mono text-xs text-nexus-cyan flex items-center gap-2">
                        <Users className="w-4 h-4" /> 6 PLAYERS ONLINE
                      </div>
                    </div>

                    <div className="h-64 rounded-xl bg-nexus-bg border border-nexus-border/60 relative overflow-hidden flex items-center justify-center">
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: 'radial-gradient(#8B5CF6 1px, transparent 1px)',
                          backgroundSize: '24px 24px',
                        }}
                      ></div>

                      <div className="absolute top-1/3 left-1/4 flex flex-col items-center gap-1 animate-bounce">
                        <span className="font-mono text-[10px] bg-nexus-accent/80 text-white px-2 py-0.5 rounded">EnochDDev</span>
                        <div className="w-8 h-8 rounded-full bg-nexus-accent border-2 border-white flex items-center justify-center shadow-lg glow-accent">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        </div>
                      </div>

                      <div className="absolute bottom-1/3 right-1/4 flex flex-col items-center gap-1">
                        <span className="font-mono text-[10px] bg-nexus-cyan/80 text-black font-bold px-2 py-0.5 rounded">ShadowRider</span>
                        <div className="w-8 h-8 rounded-full bg-nexus-cyan border-2 border-white flex items-center justify-center shadow-lg glow-cyan">
                          <div className="w-2 h-2 rounded-full bg-black"></div>
                        </div>
                      </div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-amber-400 border border-white flex items-center justify-center shadow-xl">
                        <Trophy className="w-3 h-3 text-black" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="bg-nexus-card p-3 rounded-xl border border-nexus-border text-center">
                        <div className="font-mono text-xs text-nexus-muted">TICK RATE</div>
                        <div className="font-heading text-lg font-bold text-nexus-cyan">60 FPS</div>
                      </div>
                      <div className="bg-nexus-card p-3 rounded-xl border border-nexus-border text-center">
                        <div className="font-mono text-xs text-nexus-muted">LATENCY</div>
                        <div className="font-heading text-lg font-bold text-nexus-success">&lt; 15ms</div>
                      </div>
                      <div className="bg-nexus-card p-3 rounded-xl border border-nexus-border text-center">
                        <div className="font-mono text-xs text-nexus-muted">SECURITY</div>
                        <div className="font-heading text-lg font-bold text-nexus-accent">JWT AUTH</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Game Modes Showcase Section */}
            <div className="max-w-7xl mx-auto px-6 py-16 w-full space-y-12 border-t border-nexus-border/60">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nexus-accent/20 border border-nexus-accent/40 text-nexus-accent font-mono text-xs uppercase tracking-wider">
                  <Gamepad2 className="w-4 h-4 text-nexus-accent" /> MULTIPLAYER ARENAS
                </div>
                <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-white tracking-wider">
                  FOUR DISTINCT COMPETITIVE MODES
                </h2>
                <p className="text-nexus-muted text-sm max-w-xl mx-auto">
                  Engineered with server-authoritative physics, synchronized timing, spatial grid control, and persistent global rank tracking.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mode 1: Neon Dash */}
                <div className="rounded-card bg-nexus-surface border border-nexus-border p-6 space-y-4 hover:border-nexus-accent transition-all shadow-xl group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-btn bg-nexus-accent/20 border border-nexus-accent text-nexus-accent flex items-center justify-center glow-accent group-hover:scale-105 transition-transform">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl font-bold text-white tracking-wider">NEON DASH</h3>
                        <span className="font-mono text-[10px] text-nexus-accent uppercase tracking-widest font-bold">2D COLLECTIBLE BATTLEGROUND</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-nexus-muted border border-nexus-border px-2.5 py-1 rounded">2–8 PLAYERS</span>
                  </div>
                  <p className="text-nexus-muted text-sm leading-relaxed">
                    Dash through high-octane 2D spatial battlegrounds collecting energy orbs and golden power cores. Dodge obstacles, outmaneuver opponents, and dominate the arena in 60 FPS continuous simulation.
                  </p>
                  
                  {/* How To Play Box */}
                  <div className="p-3 bg-nexus-card/70 rounded-btn border border-nexus-border/60 space-y-1.5 font-mono text-xs">
                    <div className="text-nexus-cyan font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      🎮 HOW TO PLAY
                    </div>
                    <ul className="text-nexus-muted space-y-1 text-[11px]">
                      <li>• <strong className="text-white">Controls:</strong> Use <code className="text-nexus-cyan">W / A / S / D</code> or <code className="text-nexus-cyan">Arrow Keys</code> (Touch D-Pad on mobile) to steer.</li>
                      <li>• <strong className="text-white">Objective:</strong> Collect Orbs (<span className="text-nexus-accent">+10 PTS</span>) & Golden Cores (<span className="text-amber-400">+50 PTS</span>).</li>
                      <li>• <strong className="text-white">Strategy:</strong> Dodge laser hazards and outscore rivals before time runs out.</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-nexus-border/50 font-mono text-xs">
                    <span className="text-nexus-cyan">60 FPS TICK LOOP</span>
                    <button
                      onClick={() => navigateTo(isAuthenticated ? 'lobby' : 'landing')}
                      className="text-white hover:text-nexus-cyan flex items-center gap-1 font-bold cursor-pointer"
                    >
                      ENTER ARENA <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mode 2: Reaction Rush */}
                <div className="rounded-card bg-nexus-surface border border-nexus-border p-6 space-y-4 hover:border-nexus-cyan transition-all shadow-xl group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-btn bg-nexus-cyan/20 border border-nexus-cyan text-nexus-cyan flex items-center justify-center glow-cyan group-hover:scale-105 transition-transform">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl font-bold text-white tracking-wider">REACTION RUSH</h3>
                        <span className="font-mono text-[10px] text-nexus-cyan uppercase tracking-widest font-bold">SPEED & LATENCY CHALLENGE</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-nexus-muted border border-nexus-border px-2.5 py-1 rounded">10 ROUNDS</span>
                  </div>
                  <p className="text-nexus-muted text-sm leading-relaxed">
                    Test your twitch reflexes under extreme pressure. Targets spawn at randomized coordinates and timestamps—click faster than your rivals to claim maximum reaction points and first-strike bonuses.
                  </p>

                  {/* How To Play Box */}
                  <div className="p-3 bg-nexus-card/70 rounded-btn border border-nexus-border/60 space-y-1.5 font-mono text-xs">
                    <div className="text-nexus-cyan font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      🎮 HOW TO PLAY
                    </div>
                    <ul className="text-nexus-muted space-y-1 text-[11px]">
                      <li>• <strong className="text-white">Mechanics:</strong> 10 intense rounds. A neon target spawns at random coordinates.</li>
                      <li>• <strong className="text-white">Action:</strong> Tap or click the target as soon as it turns active.</li>
                      <li>• <strong className="text-white">Bonus:</strong> Reaction times under <span className="text-nexus-success">150ms</span> earn <span className="text-nexus-cyan">+100 PTS</span> + <span className="text-amber-400">+50 First-Strike Bonus</span>!</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-nexus-border/50 font-mono text-xs">
                    <span className="text-nexus-success">&lt; 150MS THRESHOLD</span>
                    <button
                      onClick={() => navigateTo(isAuthenticated ? 'lobby' : 'landing')}
                      className="text-white hover:text-nexus-cyan flex items-center gap-1 font-bold cursor-pointer"
                    >
                      ENTER ARENA <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mode 3: Territory */}
                <div className="rounded-card bg-nexus-surface border border-nexus-border p-6 space-y-4 hover:border-amber-400 transition-all shadow-xl group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-btn bg-amber-400/20 border border-amber-400 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl font-bold text-white tracking-wider">TERRITORY</h3>
                        <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest font-bold">10×10 SPATIAL CONTROL</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-nexus-muted border border-nexus-border px-2.5 py-1 rounded">100 CELLS</span>
                  </div>
                  <p className="text-nexus-muted text-sm leading-relaxed">
                    Command a 10×10 spatial grid in a tactical territory control clash. Occupy neutral cells to capture them, contest opponent strongholds, and accumulate passive score bonuses for map dominance.
                  </p>

                  {/* How To Play Box */}
                  <div className="p-3 bg-nexus-card/70 rounded-btn border border-nexus-border/60 space-y-1.5 font-mono text-xs">
                    <div className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      🎮 HOW TO PLAY
                    </div>
                    <ul className="text-nexus-muted space-y-1 text-[11px]">
                      <li>• <strong className="text-white">Controls:</strong> Navigate using <code className="text-amber-400">W / A / S / D</code> or mobile directional controls.</li>
                      <li>• <strong className="text-white">Capture:</strong> Step onto neutral grid cells to initiate control capture.</li>
                      <li>• <strong className="text-white">Dominance:</strong> Controlled cells passively generate <span className="text-amber-400">+10 PTS/SEC</span> score bonuses.</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-nexus-border/50 font-mono text-xs">
                    <span className="text-amber-400">+10 PTS/SEC CONTROL</span>
                    <button
                      onClick={() => navigateTo(isAuthenticated ? 'lobby' : 'landing')}
                      className="text-white hover:text-nexus-cyan flex items-center gap-1 font-bold cursor-pointer"
                    >
                      ENTER ARENA <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mode 4: Word Blitz */}
                <div className="rounded-card bg-nexus-surface border border-nexus-border p-6 space-y-4 hover:border-nexus-success transition-all shadow-xl group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-btn bg-nexus-success/20 border border-nexus-success text-nexus-success flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Type className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl font-bold text-white tracking-wider">WORD BLITZ</h3>
                        <span className="font-mono text-[10px] text-nexus-success uppercase tracking-widest font-bold">SYNCHRONIZED TYPING RACE</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-nexus-muted border border-nexus-border px-2.5 py-1 rounded">10 ROUNDS</span>
                  </div>
                  <p className="text-nexus-muted text-sm leading-relaxed">
                    Compete in synchronized multi-round word typing battles. Receive server-authoritative prompts, type with pinpoint precision, and claim speed multipliers before the round clock expires.
                  </p>

                  {/* How To Play Box */}
                  <div className="p-3 bg-nexus-card/70 rounded-btn border border-nexus-border/60 space-y-1.5 font-mono text-xs">
                    <div className="text-nexus-success font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      🎮 HOW TO PLAY
                    </div>
                    <ul className="text-nexus-muted space-y-1 text-[11px]">
                      <li>• <strong className="text-white">Mechanics:</strong> 10 synchronized typing rounds with server answer verification.</li>
                      <li>• <strong className="text-white">Action:</strong> Type the challenge prompt into the text box and press <code className="text-nexus-success">ENTER</code>.</li>
                      <li>• <strong className="text-white">Speed Bonus:</strong> Submitting the correct answer under 2 seconds unlocks <span className="text-nexus-success">2.0x Speed Multiplier</span>!</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-nexus-border/50 font-mono text-xs">
                    <span className="text-nexus-success">SPEED MULTIPLIERS</span>
                    <button
                      onClick={() => navigateTo(isAuthenticated ? 'lobby' : 'landing')}
                      className="text-white hover:text-nexus-cyan flex items-center gap-1 font-bold cursor-pointer"
                    >
                      ENTER ARENA <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Landing Page Footer Only */}
            <footer className="border-t border-nexus-border bg-nexus-surface py-6 text-center text-nexus-muted font-mono text-xs">
              <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>NEXUS ARENA — Real-Time Multiplayer Web Platform</div>
                <div>POWERED BY EnochDDev</div>
              </div>
            </footer>
          </div>
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          if (useAuthStore.getState().isAuthenticated) {
            navigateTo('lobby');
          }
        }}
        initialMode={authMode}
      />

      <LevelUpModal
        payload={levelUpPayload}
        onClose={() => setLevelUpPayload(null)}
      />
    </div>
  );
};

export default App;
