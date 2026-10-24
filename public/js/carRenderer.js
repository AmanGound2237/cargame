/**
 * Cyber Velocity - High-Octane 3D-Perspective Canvas Car & Highway Renderer
 * Renders pseudo-3D perspective highways, detailed 3D rear supercar models,
 * dynamic nitro exhaust flames, roadside neon light pillars, speed lines, and camera shake.
 */

const CAR_PALETTES = [
  { name: 'Neon Cyan', primary: '#00f0ff', glow: '#00e5ff', accent: '#ffffff', exhaust: '#00ffff' },
  { name: 'Laser Magenta', primary: '#ff007f', glow: '#ff2a8d', accent: '#ffe6f0', exhaust: '#ff00aa' },
  { name: 'Electric Lime', primary: '#39ff14', glow: '#00ff66', accent: '#ffffff', exhaust: '#00ff44' },
  { name: 'Hyper Violet', primary: '#9d00ff', glow: '#b84dff', accent: '#f5e8ff', exhaust: '#c44dff' },
  { name: 'Solar Orange', primary: '#ff7700', glow: '#ff9900', accent: '#fff0d0', exhaust: '#ff5500' },
  { name: 'Cyber Yellow', primary: '#ffe600', glow: '#ffea33', accent: '#ffffff', exhaust: '#ffcc00' }
];

class CarRenderer {
  constructor() {
    this.particles = [];
    this.speedLines = [];
    this.initSpeedLines();
  }

  initSpeedLines() {
    this.speedLines = [];
    for (let i = 0; i < 40; i++) {
      this.speedLines.push({
        x: Math.random() * 1200,
        y: Math.random() * 500,
        len: 40 + Math.random() * 90,
        speed: 15 + Math.random() * 25,
        alpha: 0.1 + Math.random() * 0.4
      });
    }
  }

  // Draw 2D Side Profile for Menu & Lobby Previews with high-detail metallic lighting
  drawCarSide(ctx, width, height, colorObj, time = 0) {
    ctx.clearRect(0, 0, width, height);

    const primary = colorObj?.primary || '#00f0ff';
    const glow = colorObj?.glow || '#00e5ff';
    const accent = colorObj?.accent || '#ffffff';

    const cx = width / 2;
    const cy = height / 2 + 10;
    const carW = 170;
    const carH = 48;

    ctx.save();
    ctx.translate(cx, cy);

    // Dynamic ground neon reflection
    const groundGrad = ctx.createRadialGradient(0, carH / 2, 10, 0, carH / 2, 85);
    groundGrad.addColorStop(0, glow);
    groundGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.2)');
    groundGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = groundGrad;
    ctx.globalAlpha = 0.7 + Math.sin(time * 5) * 0.2;
    ctx.fillRect(-carW / 2 - 25, carH / 2 - 12, carW + 50, 28);
    ctx.globalAlpha = 1.0;

    // Twin Exhaust Nitro Idle Jet
    const jetLen = 22 + Math.sin(time * 30) * 8;
    const jetGrad = ctx.createLinearGradient(-carW / 2 + 5, 8, -carW / 2 - jetLen, 8);
    jetGrad.addColorStop(0, '#ffffff');
    jetGrad.addColorStop(0.25, primary);
    jetGrad.addColorStop(0.7, '#ff007f');
    jetGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(-carW / 2 + 6, 4);
    ctx.lineTo(-carW / 2 - jetLen, 8);
    ctx.lineTo(-carW / 2 + 6, 12);
    ctx.closePath();
    ctx.fill();

    // Body Silhouette
    ctx.beginPath();
    ctx.moveTo(-carW / 2 + 8, carH / 2 - 10);
    ctx.lineTo(-carW / 2, 2);
    ctx.lineTo(-carW / 2 + 28, -12);
    ctx.lineTo(-carW / 2 + 38, 2);
    ctx.lineTo(-12, -20);
    ctx.lineTo(34, -20);
    ctx.lineTo(68, -4);
    ctx.lineTo(carW / 2 - 12, 6);
    ctx.lineTo(carW / 2, carH / 2 - 10);
    ctx.lineTo(carW / 2 - 18, carH / 2 - 10);
    ctx.arc(carW / 2 - 42, carH / 2 - 10, 18, 0, Math.PI, true);
    ctx.lineTo(-carW / 2 + 60, carH / 2 - 10);
    ctx.arc(-carW / 2 + 42, carH / 2 - 10, 18, 0, Math.PI, true);
    ctx.closePath();

    // Dark titanium carbon body gradient
    const bodyGrad = ctx.createLinearGradient(0, -22, 0, carH / 2);
    bodyGrad.addColorStop(0, '#1c2035');
    bodyGrad.addColorStop(0.4, '#101322');
    bodyGrad.addColorStop(1, '#06070c');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Body Neon Outline
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cyber Accents & Decal
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.moveTo(-18, 2);
    ctx.lineTo(44, 2);
    ctx.lineTo(38, 8);
    ctx.lineTo(-24, 8);
    ctx.closePath();
    ctx.fill();

    // Glass Canopy with Pilot HUD reflection
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(28, -16);
    ctx.lineTo(54, -4);
    ctx.lineTo(16, -4);
    ctx.closePath();
    const glassGrad = ctx.createLinearGradient(0, -16, 0, -4);
    glassGrad.addColorStop(0, 'rgba(0, 240, 255, 0.85)');
    glassGrad.addColorStop(0.7, 'rgba(10, 25, 45, 0.9)');
    ctx.fillStyle = glassGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wheels
    this.drawWheelSide(ctx, -carW / 2 + 42, carH / 2 - 10, 16, primary, time);
    this.drawWheelSide(ctx, carW / 2 - 42, carH / 2 - 10, 16, primary, time);

    ctx.restore();
  }

  drawWheelSide(ctx, x, y, radius, primary, time) {
    ctx.save();
    ctx.translate(x, y);

    // Tire outer
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#06070a';
    ctx.fill();
    ctx.strokeStyle = '#272b40';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Neon Rim
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0f1a';
    ctx.fill();
    ctx.strokeStyle = primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cyber Rotor Spokes
    ctx.rotate(time * 15);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((i * Math.PI) / 2) * (radius - 6), Math.sin((i * Math.PI) / 2) * (radius - 6));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Render Multi-Lane Highway with High-Speed Road Curbs, Parallax Horizon, and Realistic 3D Cars
  renderRaceTrack(ctx, width, height, players, currentUserId, scrollOffset, time) {
    const me = players.find(p => p.id === currentUserId);
    const selfWpm = me?.wpm || 0;

    // Dynamic Camera Shake on High WPM
    ctx.save();
    if (selfWpm > 45) {
      const shakeIntensity = Math.min(4.5, (selfWpm - 45) * 0.06);
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(0, 0, width, height);

    const playerCount = Math.max(1, Math.min(6, players.length));
    const laneHeight = Math.floor(height / playerCount);

    // 1. Render Highway Road Surface & Animated Neon Curbs
    for (let i = 0; i < playerCount; i++) {
      const laneY = i * laneHeight;

      // Realistic asphalt with gradient sheen
      const roadGrad = ctx.createLinearGradient(0, laneY, 0, laneY + laneHeight);
      roadGrad.addColorStop(0, '#0a0c1a');
      roadGrad.addColorStop(0.5, '#0e1124');
      roadGrad.addColorStop(1, '#070812');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, laneY, width, laneHeight);

      // Lane Center Dashes (High-speed motion)
      if (i < playerCount - 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.setLineDash([32, 24]);
        ctx.lineDashOffset = -scrollOffset * 2.2;
        ctx.beginPath();
        ctx.moveTo(0, laneY + laneHeight);
        ctx.lineTo(width, laneY + laneHeight);
        ctx.stroke();
        ctx.restore();
      }

      // Dynamic Roadside Neon Hazard Stripes on top and bottom lanes
      if (i === 0 || i === playerCount - 1) {
        const curbY = i === 0 ? 0 : height - 8;
        this.drawCurbStripes(ctx, 0, curbY, width, 8, scrollOffset);
      }

      // Lane Holographic Watermark
      ctx.save();
      ctx.font = '900 36px Orbitron';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.fillText(`ZONE 0${i + 1}`, 35, laneY + laneHeight / 2 + 12);
      ctx.restore();
    }

    // Glowing Barrier Rails
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(width, 4);
    ctx.moveTo(0, height - 4);
    ctx.lineTo(width, height - 4);
    ctx.stroke();
    ctx.restore();

    // 2. High-Speed Warp Lines (appear when player is typing fast)
    if (selfWpm > 30) {
      this.renderSpeedLines(ctx, width, height, selfWpm);
    }

    // 3. Finish Line Gantry (At x = width - 110)
    const finishX = width - 100;
    this.drawFinishLine(ctx, finishX, 0, height, time);

    // 4. Update Nitro Particle Exhaust Sparks
    this.updateParticles(ctx, scrollOffset);

    // 5. Draw All Competitor Supercars
    players.forEach((p, idx) => {
      const laneY = (p.lane !== undefined ? p.lane : idx) * laneHeight;
      const centerY = laneY + laneHeight / 2;

      // Track distance mapped from start (x=115) to finish (x=finishX)
      const startX = 115;
      const trackDistance = finishX - startX;
      const currentX = startX + (Math.min(100, p.progress || 0) / 100) * trackDistance;

      const isUser = p.id === currentUserId;
      this.drawSupercar(ctx, currentX, centerY, p, isUser, time);

      // Spawn fiery nitro exhaust particles based on WPM
      const wpm = p.wpm || 0;
      if (wpm > 0 && Math.random() < Math.min(0.9, 0.4 + (wpm / 100))) {
        this.spawnNitroParticle(currentX - 52, centerY, p.color?.glow || '#00f0ff', wpm);
      }
    });

    ctx.restore(); // End camera shake transform
  }

  // Glowing Roadside Curb Hazard Stripes
  drawCurbStripes(ctx, x, y, width, h, offset) {
    const segW = 20;
    const count = Math.ceil(width / segW) + 2;
    const shift = (offset * 2.2) % (segW * 2);

    ctx.save();
    for (let i = -2; i < count; i++) {
      const segX = x + (i * segW) - shift;
      ctx.fillStyle = i % 2 === 0 ? '#ff007f' : '#ffe600';
      ctx.fillRect(segX, y, segW, h);
    }
    ctx.restore();
  }

  // Speed Motion Blur Lines
  renderSpeedLines(ctx, width, height, wpm) {
    ctx.save();
    const intensity = Math.min(1.0, (wpm - 30) / 70);
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;

    this.speedLines.forEach(line => {
      line.x -= line.speed * (1 + intensity * 1.5);
      if (line.x < -line.len) {
        line.x = width + Math.random() * 200;
        line.y = Math.random() * height;
      }
      ctx.globalAlpha = line.alpha * intensity;
      ctx.lineWidth = 1 + intensity * 2;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x - line.len, line.y);
      ctx.stroke();
    });

    ctx.restore();
  }

  // Holographic 3D Checkered Finish Gate
  drawFinishLine(ctx, x, y, height, time) {
    const tileH = 16;
    const tileW = 16;
    const cols = 3;
    const rows = Math.ceil(height / tileH);

    ctx.save();

    // Checkered board
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWhite = (r + c) % 2 === 0;
        ctx.fillStyle = isWhite ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 240, 255, 0.25)';
        ctx.fillRect(x + c * tileW, y + r * tileH, tileW, tileH);
      }
    }

    // Glowing Laser Beam Vertical Columns
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.moveTo(x + (cols * tileW), y);
    ctx.lineTo(x + (cols * tileW), y + height);
    ctx.stroke();

    // Holographic Banner
    ctx.save();
    ctx.translate(x + 24, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '900 13px Orbitron';
    ctx.letterSpacing = '3px';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.fillText('FINISH LINE', 0, 0);
    ctx.restore();

    ctx.restore();
  }

  // Draw Detailed Sculpted Supercar (Top-Down / 2.5D with 3D Tail Wing and Headlight Beams)
  drawSupercar(ctx, x, y, player, isUser, time) {
    const primary = player.color?.primary || '#00f0ff';
    const glow = player.color?.glow || '#00e5ff';
    const wpm = player.wpm || 0;

    const carLen = 92;
    const carWid = 42;

    ctx.save();
    ctx.translate(x, y);

    // Headlight Projection Cones
    ctx.save();
    const beamGrad = ctx.createRadialGradient(carLen / 2, 0, 5, carLen / 2 + 130, 0, 95);
    beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    beamGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.25)');
    beamGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(carLen / 2 - 5, -carWid / 3);
    ctx.lineTo(carLen / 2 + 140, -carWid * 1.2);
    ctx.lineTo(carLen / 2 + 140, carWid * 1.2);
    ctx.lineTo(carLen / 2 - 5, carWid / 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dynamic Ground Underglow Pool
    ctx.save();
    const underglow = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
    underglow.addColorStop(0, glow);
    underglow.addColorStop(0.5, 'rgba(0, 240, 255, 0.3)');
    underglow.addColorStop(1, 'transparent');
    ctx.fillStyle = underglow;
    ctx.globalAlpha = 0.6 + Math.min(0.4, wpm / 90);
    ctx.fillRect(-carLen / 2 - 15, -carWid / 2 - 14, carLen + 30, carWid + 28);
    ctx.restore();

    // Dual Nitro Exhaust Flame Jets (Dramatic expanding fire cones)
    const flameBaseLen = 12 + Math.min(55, (wpm / 100) * 55);
    const flameFlicker = Math.sin(time * 35) * 4;
    const flameSize = flameBaseLen + flameFlicker;
    this.drawExhaustFlame(ctx, -carLen / 2 - 2, -11, flameSize, glow, time);
    this.drawExhaustFlame(ctx, -carLen / 2 - 2, 11, flameSize, glow, time);

    // Car Body Aerodynamic Silhouette
    ctx.beginPath();
    ctx.moveTo(carLen / 2 + 2, 0); // Front nose cone tip
    ctx.lineTo(carLen / 2 - 12, -carWid / 2 + 3); // Left front canard
    ctx.lineTo(carLen / 2 - 28, -carWid / 2); // Front left wheel arch
    ctx.lineTo(-carLen / 2 + 40, -carWid / 2 + 3); // Inset side scoop
    ctx.lineTo(-carLen / 2 + 24, -carWid / 2 - 3); // Flared wide rear hip
    ctx.lineTo(-carLen / 2 - 2, -carWid / 2 + 2); // Rear wing corner left
    ctx.lineTo(-carLen / 2 + 6, 0); // Rear diffuser center notch
    ctx.lineTo(-carLen / 2 - 2, carWid / 2 - 2); // Rear wing corner right
    ctx.lineTo(-carLen / 2 + 24, carWid / 2 + 3); // Flared wide right hip
    ctx.lineTo(-carLen / 2 + 40, carWid / 2 - 3); // Inset side scoop right
    ctx.lineTo(carLen / 2 - 28, carWid / 2); // Front right wheel arch
    ctx.lineTo(carLen / 2 - 12, carWid / 2 - 3); // Right front canard
    ctx.closePath();

    // Metallic Carbon & Body Gradient
    const carGrad = ctx.createLinearGradient(-carLen / 2, 0, carLen / 2, 0);
    carGrad.addColorStop(0, '#0b0d19');
    carGrad.addColorStop(0.3, '#171a2e');
    carGrad.addColorStop(0.7, '#242a4a');
    carGrad.addColorStop(1, '#0e1122');
    ctx.fillStyle = carGrad;
    ctx.fill();

    // Body Neon Edge Highlighting
    ctx.strokeStyle = primary;
    ctx.lineWidth = isUser ? 3 : 2;
    ctx.shadowColor = glow;
    ctx.shadowBlur = isUser ? 16 : 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cockpit Tinted Canopy (Glass Aero Dome)
    ctx.beginPath();
    ctx.moveTo(carLen / 2 - 26, 0);
    ctx.lineTo(carLen / 2 - 40, -carWid / 3);
    ctx.lineTo(-carLen / 2 + 34, -carWid / 3);
    ctx.lineTo(-carLen / 2 + 20, 0);
    ctx.lineTo(-carLen / 2 + 34, carWid / 3);
    ctx.lineTo(carLen / 2 - 40, carWid / 3);
    ctx.closePath();

    const domeGrad = ctx.createLinearGradient(0, -carWid / 3, 0, carWid / 3);
    domeGrad.addColorStop(0, 'rgba(0, 240, 255, 0.7)');
    domeGrad.addColorStop(0.5, 'rgba(5, 10, 25, 0.95)');
    domeGrad.addColorStop(1, 'rgba(0, 240, 255, 0.7)');
    ctx.fillStyle = domeGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Carbon Rear Wing Blade
    ctx.save();
    ctx.fillStyle = '#06070c';
    ctx.fillRect(-carLen / 2 - 6, -carWid / 2 + 2, 6, carWid - 4);
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.strokeRect(-carLen / 2 - 6, -carWid / 2 + 2, 6, carWid - 4);
    ctx.restore();

    // Full-Width Cyber Taillight LED Bar
    ctx.save();
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 12;
    ctx.fillRect(-carLen / 2 + 2, -carWid / 2 + 6, 4, carWid - 12);
    ctx.restore();

    // Twin Projector Headlights
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(carLen / 2 - 10, -carWid / 2 + 6, 5, 4);
    ctx.fillRect(carLen / 2 - 10, carWid / 2 - 10, 5, 4);
    ctx.shadowBlur = 0;

    ctx.restore(); // Exit car transform

    // Floating Holographic Tag above the car
    ctx.save();
    ctx.font = '700 12px Orbitron';
    const tagText = `${player.name}${isUser ? ' ★ YOU' : ''} • ${wpm} WPM`;
    const tagW = ctx.measureText(tagText).width + 18;
    const tagH = 22;

    const badgeX = x - tagW / 2;
    const badgeY = y - carWid - 12;

    ctx.fillStyle = isUser ? 'rgba(0, 240, 255, 0.25)' : 'rgba(10, 12, 28, 0.85)';
    ctx.strokeStyle = isUser ? primary : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;

    ctx.fillRect(badgeX, badgeY, tagW, tagH);
    ctx.strokeRect(badgeX, badgeY, tagW, tagH);

    ctx.fillStyle = isUser ? '#00f0ff' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, x, badgeY + tagH / 2);
    ctx.restore();
  }

  // Blazing Nitro Exhaust Flame Jet with Internal Shock Diamonds
  drawExhaustFlame(ctx, x, y, len, glow, time) {
    if (len <= 0) return;
    ctx.save();

    // Outer plasma cone
    const flameGrad = ctx.createLinearGradient(x, y, x - len, y);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.2, '#00f0ff');
    flameGrad.addColorStop(0.5, '#ff007f');
    flameGrad.addColorStop(0.85, '#ffe600');
    flameGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = flameGrad;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x - len, y + (Math.sin(time * 40) * 3));
    ctx.lineTo(x, y + 4);
    ctx.closePath();
    ctx.fill();

    // Inner White-Hot Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x - (len * 0.4), y);
    ctx.lineTo(x, y + 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Particle System for Supersonic Nitro Spark Trails
  spawnNitroParticle(x, y, color, wpm) {
    const angle = Math.PI + (Math.random() - 0.5) * 0.4;
    const speed = 4 + Math.random() * 8 + (wpm / 15);
    this.particles.push({
      x: x,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * (1 + Math.random() * 2),
      size: 2.5 + Math.random() * 3.5,
      alpha: 1.0,
      color: color
    });
  }

  updateParticles(ctx, scrollOffset) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
      p.size = Math.max(0.5, p.size * 0.95);

      if (p.alpha <= 0 || p.x < 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

window.carRenderer = new CarRenderer();
window.CAR_PALETTES = CAR_PALETTES;
