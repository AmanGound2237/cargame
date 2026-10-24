/**
 * Cyber Velocity - Main Game Engine & Multiplayer Controller
 */

// State
let socket = null;
let currentRoom = null;
let myPlayerId = null;
let myColorIndex = 0;
let isHost = false;

// Race & Typing State
let targetSentence = "";
let currentSentenceChars = [];
let currentCharIndex = 0;
let totalTypedCount = 0;
let totalErrorCount = 0;
let currentStreak = 0;
let maxStreak = 0;
let raceStartTime = null;
let raceTimerInterval = null;
let raceActive = false;
let raceFinished = false;
let currentGear = 1;

// Audio & Canvas
let soundEngine = window.soundEngine;
let carRenderer = window.carRenderer;
let raceCanvas, raceCtx;
let previewCanvas, previewCtx;
let bgCanvas, bgCtx;
let trackScrollOffset = 0;
let animFrameId = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initCanvases();
  initColorPalette();
  initEventListeners();
  initBackgroundAnimation();
  connectSocket();

  // Check URL query for invite link (e.g. ?room=XYZ)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    document.getElementById('join-code-input').value = roomParam.trim().toUpperCase();
  }
});

/* ==========================================================================
   CANVAS INITIALIZATION
   ========================================================================== */
function initCanvases() {
  raceCanvas = document.getElementById('race-canvas');
  raceCtx = raceCanvas.getContext('2d');

  previewCanvas = document.getElementById('car-preview-canvas');
  previewCtx = previewCanvas.getContext('2d');

  bgCanvas = document.getElementById('bg-canvas');
  bgCtx = bgCanvas.getContext('2d');

  resizeBgCanvas();
  window.addEventListener('resize', () => {
    resizeBgCanvas();
  });

  // Start preview animation loop
  let previewTime = 0;
  function previewLoop() {
    previewTime += 0.03;
    const color = window.CAR_PALETTES[myColorIndex];
    carRenderer.drawCarSide(previewCtx, previewCanvas.width, previewCanvas.height, color, previewTime);
    requestAnimationFrame(previewLoop);
  }
  previewLoop();
}

function resizeBgCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}

/* ==========================================================================
   COLOR PALETTE
   ========================================================================== */
function initColorPalette() {
  const container = document.getElementById('color-palette');
  container.innerHTML = '';

  window.CAR_PALETTES.forEach((palette, idx) => {
    const swatch = document.createElement('div');
    swatch.className = `color-swatch ${idx === myColorIndex ? 'active' : ''}`;
    swatch.style.backgroundColor = palette.primary;
    swatch.style.setProperty('--swatch-glow', palette.glow);
    swatch.title = palette.name;

    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      myColorIndex = idx;
      document.getElementById('car-color-name').textContent = palette.name;

      if (socket && currentRoom && currentRoom.status === 'lobby') {
        socket.emit('update_profile', {
          name: document.getElementById('player-name-input').value,
          carColorIndex: myColorIndex
        });
      }
    });

    container.appendChild(swatch);
  });
}

/* ==========================================================================
   BACKGROUND SYNTHWAVE HORIZON
   ========================================================================== */
function initBackgroundAnimation() {
  let gridOffset = 0;

  function renderBg() {
    const w = bgCanvas.width;
    const h = bgCanvas.height;
    bgCtx.clearRect(0, 0, w, h);

    // Deep synthwave sky gradient
    const skyGrad = bgCtx.createLinearGradient(0, 0, 0, h * 0.7);
    skyGrad.addColorStop(0, '#04040d');
    skyGrad.addColorStop(0.5, '#0b0a24');
    skyGrad.addColorStop(1, '#1b0d36');
    bgCtx.fillStyle = skyGrad;
    bgCtx.fillRect(0, 0, w, h);

    // Grid Floor
    const horizonY = h * 0.65;
    gridOffset = (gridOffset + 1.2) % 40;

    bgCtx.save();
    bgCtx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    bgCtx.lineWidth = 1;

    // Horizontal perspective lines
    for (let y = horizonY; y < h; y += Math.max(4, (y - horizonY) * 0.12)) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(w, y);
      bgCtx.stroke();
    }

    // Converging vertical lines
    const fovX = w / 2;
    for (let x = -w * 0.5; x < w * 1.5; x += 55) {
      bgCtx.beginPath();
      bgCtx.moveTo(fovX, horizonY);
      bgCtx.lineTo(x + (gridOffset * (x < fovX ? -1 : 1) * 0.35), h);
      bgCtx.stroke();
    }

    // Glowing Neon Horizon Sun
    const sunGrad = bgCtx.createRadialGradient(w / 2, horizonY, 15, w / 2, horizonY, 190);
    sunGrad.addColorStop(0, '#ff007f');
    sunGrad.addColorStop(0.4, '#ffe600');
    sunGrad.addColorStop(0.8, 'rgba(255, 0, 127, 0.2)');
    sunGrad.addColorStop(1, 'transparent');
    bgCtx.fillStyle = sunGrad;
    bgCtx.beginPath();
    bgCtx.arc(w / 2, horizonY, 150, Math.PI, 0, false);
    bgCtx.fill();

    bgCtx.restore();

    requestAnimationFrame(renderBg);
  }

  renderBg();
}

/* ==========================================================================
   SOCKET.IO NETWORKING
   ========================================================================== */
function connectSocket() {
  socket = io();

  socket.on('connect', () => {
    myPlayerId = socket.id;
  });

  socket.on('room_created', ({ roomCode, room, playerId }) => {
    myPlayerId = playerId;
    isHost = true;
    currentRoom = room;
    showView('view-lobby');
    updateLobbyUI();
    showToast(`Race Room ${roomCode} created!`);
  });

  socket.on('room_joined', ({ roomCode, room, playerId }) => {
    myPlayerId = playerId;
    currentRoom = room;
    const me = room.players.find(p => p.id === myPlayerId);
    isHost = me?.isHost || false;
    showView('view-lobby');
    updateLobbyUI();
    showToast(`Joined race room: ${roomCode}`);
  });

  socket.on('join_error', ({ message }) => {
    showToast(message || 'Error joining room');
  });

  socket.on('room_updated', ({ room }) => {
    currentRoom = room;
    const me = room.players.find(p => p.id === myPlayerId);
    isHost = me?.isHost || false;
    updateLobbyUI();
  });

  socket.on('race_countdown_started', ({ room }) => {
    currentRoom = room;
    showView('view-race');
    setupTypingSentence(room.sentence);
    startCountdownSequence();
  });

  socket.on('countdown_tick', ({ count }) => {
    updateCountdownDisplay(count);
  });

  socket.on('race_started', ({ room, startTime }) => {
    currentRoom = room;
    raceStartTime = startTime || Date.now();
    startRaceGameplay();
  });

  socket.on('opponent_progress', ({ playerId, progress, wpm, speedKmh, accuracy, finished }) => {
    if (!currentRoom) return;
    const player = currentRoom.players.find(p => p.id === playerId);
    if (player) {
      player.progress = progress;
      player.wpm = wpm;
      player.speedKmh = speedKmh;
      player.accuracy = accuracy;
      player.finished = finished;
    }
    updateLivePositions();
  });

  socket.on('player_finished', ({ playerId, playerName, rank, finishTime, wpm, accuracy }) => {
    if (playerId === myPlayerId) {
      raceFinished = true;
      document.getElementById('input-status-indicator').textContent = 'FINISHED!';
      document.getElementById('input-status-indicator').style.color = '#39ff14';
      soundEngine.playVictory();
      triggerComboPopup('CHECKERED FLAG!');
    }
  });

  socket.on('race_completed', ({ room }) => {
    currentRoom = room;
    setTimeout(() => {
      showResultsPodium();
    }, 1200);
  });

  socket.on('rematch_initiated', ({ room }) => {
    currentRoom = room;
    document.getElementById('podium-modal').classList.add('hidden');
    showView('view-lobby');
    updateLobbyUI();
    showToast('New race lobby initialized!');
  });
}

/* ==========================================================================
   UI VIEW NAVIGATION
   ========================================================================== */
function showView(viewId) {
  document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');

  if (viewId !== 'view-race' && animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
    if (raceTimerInterval) {
      clearInterval(raceTimerInterval);
      raceTimerInterval = null;
    }
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

function triggerComboPopup(text) {
  const popup = document.getElementById('combo-popup');
  popup.textContent = text;
  popup.classList.remove('hidden');
  clearTimeout(popup._timeout);
  popup._timeout = setTimeout(() => {
    popup.classList.add('hidden');
  }, 900);
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */
function initEventListeners() {
  const nameInput = document.getElementById('player-name-input');

  // Sound Toggle
  const soundBtn = document.getElementById('sound-toggle-btn');
  soundBtn.addEventListener('click', () => {
    soundEngine.ensureContext();
    const enabled = soundEngine.toggleSound();
    document.getElementById('sound-icon').textContent = enabled ? '🔊' : '🔇';
    document.getElementById('sound-text').textContent = enabled ? 'AUDIO ON' : 'MUTED';
  });

  // Name Input change
  nameInput.addEventListener('change', () => {
    if (socket && currentRoom && currentRoom.status === 'lobby') {
      socket.emit('update_profile', {
        name: nameInput.value,
        carColorIndex: myColorIndex
      });
    }
  });

  // QUICK RACE (Solo vs AI Bots for immediate thrill)
  document.getElementById('btn-quick-race').addEventListener('click', () => {
    soundEngine.ensureContext();
    const name = nameInput.value || 'ApexPilot';
    socket.emit('create_room', {
      playerName: name,
      carColorIndex: myColorIndex,
      withBots: true
    });
  });

  // CREATE MULTIPLAYER RACE
  document.getElementById('btn-create-room').addEventListener('click', () => {
    soundEngine.ensureContext();
    const name = nameInput.value || 'ApexPilot';
    socket.emit('create_room', {
      playerName: name,
      carColorIndex: myColorIndex,
      withBots: false
    });
  });

  // JOIN ROOM
  document.getElementById('btn-join-room').addEventListener('click', () => {
    soundEngine.ensureContext();
    const code = document.getElementById('join-code-input').value.trim().toUpperCase();
    if (!code) {
      showToast('Please enter a room code');
      return;
    }
    const name = nameInput.value || 'ApexPilot';
    socket.emit('join_room', {
      roomCode: code,
      playerName: name,
      carColorIndex: myColorIndex
    });
  });

  // COPY INVITE LINK
  document.getElementById('btn-copy-link').addEventListener('click', () => {
    if (!currentRoom) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom.code}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('Invite link copied! Send to friends.');
    }).catch(() => {
      showToast(`Share Code: ${currentRoom.code}`);
    });
  });

  // LOBBY: ADD AI BOT
  document.getElementById('btn-add-bot').addEventListener('click', () => {
    if (socket && currentRoom && isHost) {
      socket.emit('add_bot');
    }
  });

  // LOBBY: CLEAR BOTS
  document.getElementById('btn-clear-bots').addEventListener('click', () => {
    if (socket && currentRoom && isHost) {
      socket.emit('remove_bots');
    }
  });

  // LOBBY: TOGGLE READY
  document.getElementById('btn-toggle-ready').addEventListener('click', () => {
    if (socket && currentRoom) {
      socket.emit('toggle_ready');
    }
  });

  // LOBBY: START RACE
  document.getElementById('btn-start-race').addEventListener('click', () => {
    if (socket && currentRoom && isHost) {
      socket.emit('start_race');
    }
  });

  // LOBBY: LEAVE
  document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    window.location.reload();
  });

  // TYPING INPUT HANDLING
  const typeInput = document.getElementById('type-input');
  typeInput.addEventListener('input', handleTypingInput);
  typeInput.addEventListener('keydown', (e) => {
    if (!raceActive || raceFinished) {
      if (e.key !== 'Tab') e.preventDefault();
    }
  });

  // Focus trap on clicking display
  document.getElementById('typing-display-box').addEventListener('click', () => {
    typeInput.focus();
  });

  // PODIUM BUTTONS
  document.getElementById('btn-podium-lobby').addEventListener('click', () => {
    document.getElementById('podium-modal').classList.add('hidden');
    showView('view-lobby');
    updateLobbyUI();
  });

  document.getElementById('btn-podium-rematch').addEventListener('click', () => {
    if (socket && currentRoom && isHost) {
      socket.emit('play_again');
    }
  });
}

/* ==========================================================================
   LOBBY MANAGEMENT
   ========================================================================== */
function updateLobbyUI() {
  if (!currentRoom) return;

  document.getElementById('lobby-room-code').textContent = currentRoom.code;
  document.getElementById('lobby-player-count').textContent = `${currentRoom.players.length} / 6 Racers`;

  const grid = document.getElementById('racers-grid');
  grid.innerHTML = '';

  const me = currentRoom.players.find(p => p.id === myPlayerId);
  isHost = me?.isHost || false;

  document.querySelectorAll('.host-only').forEach(btn => {
    btn.style.display = isHost ? 'inline-flex' : 'none';
  });

  const readyBtn = document.getElementById('btn-toggle-ready');
  if (isHost) {
    readyBtn.style.display = 'none';
  } else {
    readyBtn.style.display = 'inline-flex';
    document.getElementById('ready-btn-text').textContent = me?.isReady ? 'UNREADY' : 'READY UP';
  }

  // Start Race button enabled if host and all non-hosts ready
  const startBtn = document.getElementById('btn-start-race');
  const allOthersReady = currentRoom.players.filter(p => !p.isHost).every(p => p.isReady);
  if (isHost && allOthersReady) {
    startBtn.classList.remove('disabled');
    startBtn.removeAttribute('disabled');
  } else if (isHost) {
    startBtn.classList.add('disabled');
    startBtn.setAttribute('disabled', 'true');
  }

  // Render Racers
  currentRoom.players.forEach(p => {
    const card = document.createElement('div');
    card.className = `racer-slot-card ${p.id === myPlayerId ? 'is-self' : ''} ${p.isReady ? 'is-ready' : ''}`;

    if (p.isHost) {
      const crown = document.createElement('div');
      crown.className = 'host-crown';
      crown.innerHTML = '👑 HOST';
      card.appendChild(crown);
    } else if (p.isBot) {
      const botBadge = document.createElement('div');
      botBadge.className = 'host-crown';
      botBadge.style.color = '#39ff14';
      botBadge.innerHTML = '🤖 AI';
      card.appendChild(botBadge);
    }

    const badge = document.createElement('div');
    badge.className = `ready-badge ${p.isReady ? 'ready' : ''}`;
    badge.textContent = p.isHost ? 'HOST' : (p.isReady ? 'READY' : 'WAITING');
    card.appendChild(badge);

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'slot-canvas-wrap';
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');
    carRenderer.drawCarSide(ctx, 160, 70, p.color, 0);
    canvasWrap.appendChild(canvas);
    card.appendChild(canvasWrap);

    const nameEl = document.createElement('div');
    nameEl.className = 'slot-name';
    nameEl.textContent = p.name + (p.id === myPlayerId ? ' (YOU)' : '');
    card.appendChild(nameEl);

    const laneEl = document.createElement('div');
    laneEl.className = 'slot-lane';
    laneEl.textContent = `LANE 0${(p.lane !== undefined ? p.lane : 0) + 1} • ${p.color?.name || 'Cyan'}`;
    card.appendChild(laneEl);

    grid.appendChild(card);
  });
}

/* ==========================================================================
   RACE COUNTDOWN & START
   ========================================================================== */
function setupTypingSentence(sentence) {
  targetSentence = sentence;
  currentCharIndex = 0;
  totalTypedCount = 0;
  totalErrorCount = 0;
  currentStreak = 0;
  maxStreak = 0;
  raceFinished = false;
  currentGear = 1;

  const displayEl = document.getElementById('text-display');
  displayEl.innerHTML = '';

  currentSentenceChars = sentence.split('');
  currentSentenceChars.forEach((char, idx) => {
    const span = document.createElement('span');
    span.className = `char ${idx === 0 ? 'current' : ''}`;
    span.textContent = char;
    span.id = `char-${idx}`;
    displayEl.appendChild(span);
  });

  const typeInput = document.getElementById('type-input');
  typeInput.value = '';
  typeInput.disabled = true;

  updateSpeedometer(0);
  updateNitroBar(0);
  document.getElementById('hud-wpm').textContent = '0';
  document.getElementById('hud-speed').innerHTML = '0 <small>KM/H</small>';
  document.getElementById('hud-accuracy').textContent = '100%';
  document.getElementById('hud-gear').textContent = 'GEAR 1';
  document.getElementById('hud-streak').textContent = 'x0';
  document.getElementById('hud-time').textContent = '0.0s';
  document.getElementById('hud-position').textContent = '1st';
}

function startCountdownSequence() {
  const overlay = document.getElementById('countdown-overlay');
  overlay.classList.remove('hidden');
  updateCountdownDisplay(3);
}

function updateCountdownDisplay(count) {
  const numEl = document.getElementById('countdown-number');
  const subEl = document.getElementById('countdown-sub');

  if (count > 0) {
    numEl.textContent = count;
    subEl.textContent = 'REV ENGINES';
    numEl.style.color = '#00f0ff';
    soundEngine.playCountdown(count);
  } else if (count === 0) {
    numEl.textContent = 'GO!';
    subEl.textContent = 'ACCELERATE TO HYPERDRIVE';
    numEl.style.color = '#39ff14';
    soundEngine.playCountdown(0);
  }
}

function startRaceGameplay() {
  const overlay = document.getElementById('countdown-overlay');
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 400);

  raceActive = true;
  raceFinished = false;

  const typeInput = document.getElementById('type-input');
  typeInput.disabled = false;
  typeInput.value = '';
  typeInput.focus();

  document.getElementById('input-status-indicator').textContent = 'THROTTLE OPEN';
  document.getElementById('input-status-indicator').className = 'input-status';

  if (raceTimerInterval) clearInterval(raceTimerInterval);
  raceTimerInterval = setInterval(() => {
    if (!raceActive || raceFinished) return;
    const elapsedSec = ((Date.now() - raceStartTime) / 1000).toFixed(1);
    document.getElementById('hud-time').textContent = `${elapsedSec}s`;
  }, 100);

  startRaceRenderLoop();
}

/* ==========================================================================
   TYPING ENGINE & GEAR PHYSICS
   ========================================================================== */
function handleTypingInput(e) {
  if (!raceActive || raceFinished) return;

  const inputVal = e.target.value;
  const currentExpectedChar = targetSentence[currentCharIndex];
  const lastTypedChar = inputVal[inputVal.length - 1];

  if (!lastTypedChar) return;

  totalTypedCount++;

  if (lastTypedChar === currentExpectedChar) {
    const prevSpan = document.getElementById(`char-${currentCharIndex}`);
    if (prevSpan) {
      prevSpan.className = 'char typed-correct';
    }

    currentCharIndex++;
    currentStreak++;
    if (currentStreak > maxStreak) maxStreak = currentStreak;

    soundEngine.playKeyClick();

    // Nitro Overdrive burst
    if (currentStreak > 0 && currentStreak % 15 === 0) {
      soundEngine.playNitro();
      triggerComboPopup('🔥 NITRO OVERDRIVE!');
    }

    if (currentCharIndex < targetSentence.length) {
      const nextSpan = document.getElementById(`char-${currentCharIndex}`);
      if (nextSpan) {
        nextSpan.className = 'char current';
      }
    }

    if (lastTypedChar === ' ' || inputVal.length > 25) {
      e.target.value = '';
    }

    document.getElementById('input-status-indicator').textContent = 'MAX RPM';
    document.getElementById('input-status-indicator').className = 'input-status';

  } else {
    totalErrorCount++;
    currentStreak = 0;

    const errSpan = document.getElementById(`char-${currentCharIndex}`);
    if (errSpan) {
      errSpan.classList.add('error');
      setTimeout(() => errSpan.classList.remove('error'), 250);
    }

    soundEngine.playError();
    document.getElementById('input-status-indicator').textContent = 'MISFIRE';
    document.getElementById('input-status-indicator').className = 'input-status error';

    e.target.value = inputVal.slice(0, -1);
  }

  // Calculate live telemetry
  const elapsedMinutes = Math.max(0.01, (Date.now() - raceStartTime) / 60000);
  const wpm = Math.round((currentCharIndex / 5) / elapsedMinutes);
  const accuracy = Math.max(0, Math.round(((totalTypedCount - totalErrorCount) / Math.max(1, totalTypedCount)) * 100));
  const speedKmh = Math.round(wpm * 2.2);

  // Dynamic Gear Shifting
  let gearName = 'GEAR 1';
  if (wpm >= 115) gearName = 'HYPERDRIVE';
  else if (wpm >= 90) gearName = 'GEAR 5';
  else if (wpm >= 65) gearName = 'GEAR 4';
  else if (wpm >= 40) gearName = 'GEAR 3';
  else if (wpm >= 20) gearName = 'GEAR 2';

  document.getElementById('hud-gear').textContent = gearName;
  document.getElementById('hud-wpm').textContent = wpm;
  document.getElementById('hud-speed').innerHTML = `${speedKmh} <small>KM/H</small>`;
  document.getElementById('hud-accuracy').textContent = `${accuracy}%`;
  document.getElementById('hud-streak').textContent = `x${currentStreak}`;

  updateSpeedometer(wpm);
  updateNitroBar(currentStreak);
  soundEngine.setSpeed(wpm);

  if (currentRoom) {
    const me = currentRoom.players.find(p => p.id === myPlayerId);
    if (me) {
      me.progress = Math.min(100, Math.round((currentCharIndex / targetSentence.length) * 100));
      me.wpm = wpm;
      me.speedKmh = speedKmh;
      me.accuracy = accuracy;
    }
  }

  if (socket) {
    socket.emit('typing_update', {
      charsTyped: currentCharIndex,
      totalChars: targetSentence.length,
      wpm: wpm,
      accuracy: accuracy,
      speedKmh: speedKmh
    });
  }

  updateLivePositions();

  if (currentCharIndex >= targetSentence.length) {
    raceFinished = true;
    typeInput.disabled = true;
  }
}

function updateSpeedometer(wpm) {
  document.getElementById('speedo-num').textContent = wpm;
  const maxWpm = 140;
  const percentage = Math.min(1, Math.max(0, wpm / maxWpm));
  const dashoffset = 141 - (percentage * 141);
  const arc = document.getElementById('speedo-fill-arc');
  if (arc) {
    arc.style.strokeDashoffset = dashoffset;
    if (wpm > 105) arc.style.stroke = '#ff007f';
    else if (wpm > 70) arc.style.stroke = '#ffe600';
    else arc.style.stroke = '#00f0ff';
  }
}

function updateNitroBar(streak) {
  const maxStreakForFull = 30;
  const pct = Math.min(100, Math.round((streak / maxStreakForFull) * 100));
  document.getElementById('nitro-bar-fill').style.width = `${pct}%`;

  const statusText = document.getElementById('nitro-level-text');
  if (pct >= 100) {
    statusText.textContent = 'HYPERDRIVE ACTIVE!';
    statusText.style.color = '#39ff14';
  } else if (pct >= 50) {
    statusText.textContent = 'NITRO SPOOLING';
    statusText.style.color = '#ffe600';
  } else {
    statusText.textContent = 'WARMUP';
    statusText.style.color = '#ff007f';
  }
}

function updateLivePositions() {
  if (!currentRoom || !currentRoom.players) return;

  const sorted = [...currentRoom.players].sort((a, b) => {
    if ((b.progress || 0) !== (a.progress || 0)) {
      return (b.progress || 0) - (a.progress || 0);
    }
    return (b.wpm || 0) - (a.wpm || 0);
  });

  const myRank = sorted.findIndex(p => p.id === myPlayerId) + 1;
  const suffix = myRank === 1 ? '1st' : myRank === 2 ? '2nd' : myRank === 3 ? '3rd' : `${myRank}th`;
  document.getElementById('hud-position').textContent = suffix;
}

/* ==========================================================================
   RACE TRACK CANVAS RENDER LOOP
   ========================================================================== */
function startRaceRenderLoop() {
  if (animFrameId) cancelAnimationFrame(animFrameId);

  let renderTime = 0;

  function loop() {
    renderTime += 0.03;

    const me = currentRoom?.players?.find(p => p.id === myPlayerId);
    const selfWpm = me?.wpm || 0;
    const scrollSpeed = 4 + (selfWpm / 12);
    trackScrollOffset += scrollSpeed;

    if (raceCanvas && raceCtx && currentRoom) {
      carRenderer.renderRaceTrack(
        raceCtx,
        raceCanvas.width,
        raceCanvas.height,
        currentRoom.players,
        myPlayerId,
        trackScrollOffset,
        renderTime
      );
    }

    animFrameId = requestAnimationFrame(loop);
  }

  loop();
}

/* ==========================================================================
   RESULTS / PODIUM MODAL
   ========================================================================== */
function showResultsPodium() {
  if (!currentRoom) return;

  const modal = document.getElementById('podium-modal');
  modal.classList.remove('hidden');

  const ranked = [...currentRoom.players].sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    if (a.rank) return -1;
    if (b.rank) return 1;
    return (b.progress || 0) - (a.progress || 0);
  });

  const me = ranked.find(p => p.id === myPlayerId);
  const myIndex = ranked.indexOf(me);
  const badge = document.getElementById('user-finish-badge');
  if (myIndex === 0) {
    badge.textContent = '🏆 1ST PLACE CHAMPION!';
    badge.style.background = 'linear-gradient(135deg, #ffe600 0%, #ff7700 100%)';
  } else if (myIndex === 1) {
    badge.textContent = '🥈 2ND PLACE PODIUM!';
    badge.style.background = 'linear-gradient(135deg, #00f0ff 0%, #0077ff 100%)';
  } else if (myIndex === 2) {
    badge.textContent = '🥉 3RD PLACE!';
    badge.style.background = 'linear-gradient(135deg, #ff007f 0%, #9d00ff 100%)';
  } else {
    badge.textContent = `RANK #${myIndex + 1}`;
    badge.style.background = 'rgba(255, 255, 255, 0.2)';
  }

  const podiumSlots = document.getElementById('podium-slots');
  podiumSlots.innerHTML = '';

  const podiumOrder = [
    { rank: 2, placeClass: 'place-2', trophy: '🥈', player: ranked[1] },
    { rank: 1, placeClass: 'place-1', trophy: '👑', player: ranked[0] },
    { rank: 3, placeClass: 'place-3', trophy: '🥉', player: ranked[2] }
  ];

  podiumOrder.forEach(slot => {
    if (slot.player) {
      const el = document.createElement('div');
      el.className = `podium-slot ${slot.placeClass}`;
      el.innerHTML = `
        <div class="podium-trophy">${slot.trophy}</div>
        <div class="podium-pilot-name">${slot.player.name}</div>
        <div class="podium-pillar">${slot.rank}</div>
      `;
      podiumSlots.appendChild(el);
    }
  });

  const tbody = document.getElementById('results-tbody');
  tbody.innerHTML = '';

  ranked.forEach((p, idx) => {
    const tr = document.createElement('tr');
    if (p.id === myPlayerId) tr.className = 'highlight';

    const rankText = idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`;
    const finishTime = p.finishTime ? `${p.finishTime}s` : 'DNF';

    tr.innerHTML = `
      <td>${rankText}</td>
      <td>${p.name}${p.id === myPlayerId ? ' (YOU)' : ''}</td>
      <td>${p.wpm || 0}</td>
      <td>${p.speedKmh || 0} KM/H</td>
      <td>${p.accuracy || 100}%</td>
      <td>${finishTime}</td>
    `;
    tbody.appendChild(tr);
  });
}
