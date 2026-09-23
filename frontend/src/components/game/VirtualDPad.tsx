import React, { useRef, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualDPadProps {
  onDirectionChange: (keys: { up: boolean; down: boolean; left: boolean; right: boolean }) => void;
  className?: string;
}

export const VirtualDPad: React.FC<VirtualDPadProps> = ({ onDirectionChange, className = '' }) => {
  const activeStateRef = useRef({ up: false, down: false, left: false, right: false });
  const [activeKeys, setActiveKeys] = useState({ up: false, down: false, left: false, right: false });

  const setDir = useCallback((dir: 'up' | 'down' | 'left' | 'right', value: boolean) => {
    if (activeStateRef.current[dir] === value) return;
    const nextState = { ...activeStateRef.current, [dir]: value };
    activeStateRef.current = nextState;
    setActiveKeys(nextState);
    onDirectionChange(nextState);
  }, [onDirectionChange]);

  const handleStart = (dir: 'up' | 'down' | 'left' | 'right') => (e: React.SyntheticEvent) => {
    if (e.cancelable) e.preventDefault();
    setDir(dir, true);
  };

  const handleEnd = (dir: 'up' | 'down' | 'left' | 'right') => (e: React.SyntheticEvent) => {
    if (e.cancelable) e.preventDefault();
    setDir(dir, false);
  };

  return (
    <div className={`relative w-40 h-40 select-none touch-none ${className}`}>
      {/* Background Circle */}
      <div className="absolute inset-0 rounded-full bg-nexus-surface/90 border-2 border-nexus-border backdrop-blur shadow-2xl flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-nexus-card border border-nexus-border flex items-center justify-center font-mono text-[9px] text-nexus-cyan font-bold tracking-widest">
          PAD
        </div>
      </div>

      {/* UP */}
      <button
        type="button"
        onTouchStart={handleStart('up')}
        onTouchEnd={handleEnd('up')}
        onTouchCancel={handleEnd('up')}
        onMouseDown={handleStart('up')}
        onMouseUp={handleEnd('up')}
        onMouseLeave={handleEnd('up')}
        className={`absolute top-1 left-1/2 -translate-x-1/2 w-12 h-12 rounded-t-2xl flex items-center justify-center transition-all cursor-pointer ${
          activeKeys.up
            ? 'bg-nexus-cyan text-black shadow-lg glow-cyan scale-95'
            : 'bg-nexus-card/90 border border-nexus-border text-nexus-cyan active:bg-nexus-cyan active:text-black'
        }`}
        aria-label="Move Up"
      >
        <ChevronUp className="w-7 h-7" />
      </button>

      {/* DOWN */}
      <button
        type="button"
        onTouchStart={handleStart('down')}
        onTouchEnd={handleEnd('down')}
        onTouchCancel={handleEnd('down')}
        onMouseDown={handleStart('down')}
        onMouseUp={handleEnd('down')}
        onMouseLeave={handleEnd('down')}
        className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-12 rounded-b-2xl flex items-center justify-center transition-all cursor-pointer ${
          activeKeys.down
            ? 'bg-nexus-cyan text-black shadow-lg glow-cyan scale-95'
            : 'bg-nexus-card/90 border border-nexus-border text-nexus-cyan active:bg-nexus-cyan active:text-black'
        }`}
        aria-label="Move Down"
      >
        <ChevronDown className="w-7 h-7" />
      </button>

      {/* LEFT */}
      <button
        type="button"
        onTouchStart={handleStart('left')}
        onTouchEnd={handleEnd('left')}
        onTouchCancel={handleEnd('left')}
        onMouseDown={handleStart('left')}
        onMouseUp={handleEnd('left')}
        onMouseLeave={handleEnd('left')}
        className={`absolute left-1 top-1/2 -translate-y-1/2 w-12 h-12 rounded-l-2xl flex items-center justify-center transition-all cursor-pointer ${
          activeKeys.left
            ? 'bg-nexus-cyan text-black shadow-lg glow-cyan scale-95'
            : 'bg-nexus-card/90 border border-nexus-border text-nexus-cyan active:bg-nexus-cyan active:text-black'
        }`}
        aria-label="Move Left"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>

      {/* RIGHT */}
      <button
        type="button"
        onTouchStart={handleStart('right')}
        onTouchEnd={handleEnd('right')}
        onTouchCancel={handleEnd('right')}
        onMouseDown={handleStart('right')}
        onMouseUp={handleEnd('right')}
        onMouseLeave={handleEnd('right')}
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-12 h-12 rounded-r-2xl flex items-center justify-center transition-all cursor-pointer ${
          activeKeys.right
            ? 'bg-nexus-cyan text-black shadow-lg glow-cyan scale-95'
            : 'bg-nexus-card/90 border border-nexus-border text-nexus-cyan active:bg-nexus-cyan active:text-black'
        }`}
        aria-label="Move Right"
      >
        <ChevronRight className="w-7 h-7" />
      </button>
    </div>
  );
};
