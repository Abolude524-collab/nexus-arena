import { GameState } from '@nexus-arena/shared';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
  }

  public render(state: GameState, localUserId?: string): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const scaleX = width / state.arenaWidth;
    const scaleY = height / state.arenaHeight;

    // 1. Clear & Background Grid
    ctx.fillStyle = '#08090D';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // Subtle grid lines
    ctx.strokeStyle = '#151821';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= state.arenaWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.arenaHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= state.arenaHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.arenaWidth, y);
      ctx.stroke();
    }

    // Arena Outer Boundary Border
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, state.arenaWidth, state.arenaHeight);

    // 2. Render Obstacles
    state.obstacles.forEach((obs) => {
      ctx.fillStyle = '#10121A';
      ctx.strokeStyle = '#262A38';
      ctx.lineWidth = 2;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });

    // 3. Render Collectibles
    state.collectibles.forEach((col) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(col.x, col.y, col.radius, 0, Math.PI * 2);

      if (col.type === 'ENERGY') {
        ctx.fillStyle = '#22D3EE';
        ctx.shadowColor = '#22D3EE';
        ctx.shadowBlur = 12;
      } else if (col.type === 'GOLDEN') {
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 16;
      } else if (col.type === 'POWER_CORE') {
        ctx.fillStyle = '#8B5CF6';
        ctx.shadowColor = '#8B5CF6';
        ctx.shadowBlur = 20;
      }

      ctx.fill();
      ctx.restore();
    });

    // 4. Render Players
    state.players.forEach((player) => {
      ctx.save();

      // Local player aura ring
      if (player.id === localUserId) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#22D3EE';
        ctx.shadowBlur = 10;
        ctx.stroke();
      }

      // Player body circle
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 15;
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Direction vector indicator line
      if (player.velocityX !== 0 || player.velocityY !== 0) {
        const angle = Math.atan2(player.velocityY, player.velocityX);
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(
          player.x + Math.cos(angle) * (player.radius + 10),
          player.y + Math.sin(angle) * (player.radius + 10),
        );
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Username & Score Overhead Label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#F5F7FA';
      ctx.font = 'bold 12px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(player.username, player.x, player.y - player.radius - 10);

      ctx.fillStyle = '#22D3EE';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(`${player.score} PTS`, player.x, player.y - player.radius - 24);

      ctx.restore();
    });

    // 5. Countdown Overlay
    if (state.status === 'COUNTDOWN') {
      ctx.fillStyle = 'rgba(8, 9, 13, 0.6)';
      ctx.fillRect(0, 0, state.arenaWidth, state.arenaHeight);

      ctx.fillStyle = '#8B5CF6';
      ctx.font = 'extrabold 96px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#8B5CF6';
      ctx.shadowBlur = 30;

      const text = state.countdownSeconds > 0 ? `${state.countdownSeconds}` : 'GO!';
      ctx.fillText(text, state.arenaWidth / 2, state.arenaHeight / 2 + 30);
    }

    ctx.restore();
  }
}
