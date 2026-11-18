import { Zap, Target, Shield, Type, Gamepad2, LucideIcon } from 'lucide-react';

export interface GameTheme {
  /** Canonical display label as stored on the room record. */
  label: string;
  icon: LucideIcon;
  /** Text color token for the game name. */
  accentText: string;
  /** Pill/chip treatment for the game label. */
  chip: string;
  /** Icon container treatment. */
  iconBox: string;
  /** Hover border used by match cards. */
  hoverBorder: string;
  tagline: string;
}

export const GAME_THEMES: Record<string, GameTheme> = {
  'Neon Dash': {
    label: 'Neon Dash',
    icon: Zap,
    accentText: 'text-nexus-accent',
    chip: 'bg-nexus-accent/15 border-nexus-accent/40 text-nexus-accent',
    iconBox: 'bg-nexus-accent/20 border-nexus-accent text-nexus-accent glow-accent',
    hoverBorder: 'hover:border-nexus-accent/70',
    tagline: '2D COLLECTIBLE BATTLEGROUND',
  },
  'Reaction Rush': {
    label: 'Reaction Rush',
    icon: Target,
    accentText: 'text-nexus-cyan',
    chip: 'bg-nexus-cyan/15 border-nexus-cyan/40 text-nexus-cyan',
    iconBox: 'bg-nexus-cyan/20 border-nexus-cyan text-nexus-cyan glow-cyan',
    hoverBorder: 'hover:border-nexus-cyan/70',
    tagline: 'SPEED & LATENCY CHALLENGE',
  },
  Territory: {
    label: 'Territory',
    icon: Shield,
    accentText: 'text-amber-400',
    chip: 'bg-amber-400/15 border-amber-400/40 text-amber-400',
    iconBox: 'bg-amber-400/20 border-amber-400 text-amber-400',
    hoverBorder: 'hover:border-amber-400/70',
    tagline: '10×10 SPATIAL CONTROL',
  },
  'Word Blitz': {
    label: 'Word Blitz',
    icon: Type,
    accentText: 'text-nexus-success',
    chip: 'bg-nexus-success/15 border-nexus-success/40 text-nexus-success',
    iconBox: 'bg-nexus-success/20 border-nexus-success text-nexus-success',
    hoverBorder: 'hover:border-nexus-success/70',
    tagline: 'SYNCHRONIZED TYPING RACE',
  },
};

const FALLBACK_THEME: GameTheme = {
  label: 'Arena Match',
  icon: Gamepad2,
  accentText: 'text-nexus-cyan',
  chip: 'bg-nexus-card border-nexus-border text-nexus-muted',
  iconBox: 'bg-nexus-card border-nexus-border text-nexus-muted',
  hoverBorder: 'hover:border-nexus-border',
  tagline: 'LIVE MATCH',
};

export const getGameTheme = (gameType: string | undefined | null): GameTheme =>
  (gameType && GAME_THEMES[gameType]) || FALLBACK_THEME;
