const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Rich curated library of high-energy cyberpunk, racing, and sci-fi typing quotes
const SENTENCES = [
  "In the neon-drenched city of Neo-Tokyo, turbocharged engines scream through the rain-slicked asphalt under holographic billboards.",
  "Maximum velocity is not just about raw horsepower, it is the razor-sharp precision of every single keystroke pushing the engine past the redline.",
  "The twin-turbo engine roars to life as nitro fuels ignite in the combustion chamber, blasting streaks of violet lightning across the highway.",
  "Keep your eyes locked on the horizon, shift into hyperdrive, and let the pulse of the synthwave bass guide your hands to the checkered flag.",
  "Cybernetic racers carve through the midnight smog, tires screeching against the glowing cyber grid as tachometers hit nine thousand RPM.",
  "Speed has never been a question of hesitation; either you slam the throttle into the floorboards or you watch your rival disappear into the night.",
  "Digital speedometers flicker with neon brilliance while carbon fiber wings slice through the turbulent crosswinds of the elevated speedway.",
  "A perfect race demands split-second reaction times, flawless accuracy, and nerves of forged titanium as the nitro boost kicks into overdrive.",
  "When the countdown turns green, pure adrenaline surges through the chassis and every gear shift feels like lightning striking the pavement.",
  "Beneath the luminescent canopy of the megacity, high-performance machines dance on the precipice of supersonic acceleration.",
  "The finish line awaits those who dare to master the rhythm of velocity, leaving plumes of glowing blue plasma in their wake.",
  "Streets made of fiber-optic glass reflect the blazing tail lights as the leading supercar pulls away with relentless kinetic momentum.",
  "Never lift off the gas pedal when the curve tightens; trust the downforce and let the twin exhausts paint the night with blazing neon fire.",
  "Champions are not crowned in the pit lane, they are born in the heart of the straightaway where every fraction of a second is conquered.",
  "The air hums with the electric symphony of superchargers spooling up, preparing to unleash pure kinetic thunder onto the raceway."
];

const BOT_NAMES = [
  { name: 'CyberPhantom [BOT]', wpm: 48, colorIdx: 1 },
  { name: 'NeonViper [BOT]', wpm: 62, colorIdx: 2 },
  { name: 'ApexOverdrive [BOT]', wpm: 75, colorIdx: 3 },
  { name: 'QuantumRacer [BOT]', wpm: 55, colorIdx: 4 },
  { name: 'ShadowDrifter [BOT]', wpm: 70, colorIdx: 5 }
];

const CAR_COLORS = [
  { name: 'Neon Cyan', primary: '#00f0ff', glow: '#00e5ff', accent: '#ffffff', exhaust: '#00ffff' },
  { name: 'Laser Magenta', primary: '#ff007f', glow: '#ff2a8d', accent: '#ffe6f0', exhaust: '#ff00aa' },
  { name: 'Electric Lime', primary: '#39ff14', glow: '#00ff66', accent: '#ffffff', exhaust: '#00ff44' },
  { name: 'Hyper Violet', primary: '#9d00ff', glow: '#b84dff', accent: '#f5e8ff', exhaust: '#c44dff' },
  { name: 'Solar Orange', primary: '#ff7700', glow: '#ff9900', accent: '#fff0d0', exhaust: '#ff5500' },
  { name: 'Cyber Yellow', primary: '#ffe600', glow: '#ffea33', accent: '#ffffff', exhaust: '#ffcc00' }
];

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRandomSentence() {
  return SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
}

io.on('connection', (socket) => {
  let currentRoomCode = null;

  // Create Room (with optional instant bots for testing)
  socket.on('create_room', ({ playerName, carColorIndex, withBots }) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const selectedColor = CAR_COLORS[carColorIndex % CAR_COLORS.length] || CAR_COLORS[0];

    const newRoom = {
      code: roomCode,
      hostId: socket.id,
      status: 'lobby',
      sentence: getRandomSentence(),
      createdAt: Date.now(),
      startTime: null,
      botInterval: null,
      players: new Map([
        [
          socket.id,
          {
            id: socket.id,
            name: playerName ? playerName.trim().substring(0, 16) : 'Pilot 1',
            color: selectedColor,
            colorIndex: carColorIndex % CAR_COLORS.length,
            lane: 0,
            isHost: true,
            isReady: true,
            isBot: false,
            progress: 0,
            charsTyped: 0,
            wpm: 0,
            accuracy: 100,
            speedKmh: 0,
            finished: false,
            finishTime: null,
            rank: null
          }
        ]
      ])
    };

    // If user wants instant bots for testing
    if (withBots) {
      addBotsToRoom(newRoom, 3);
    }

    rooms.set(roomCode, newRoom);
    currentRoomCode = roomCode;
    socket.join(roomCode);

    socket.emit('room_created', {
      roomCode,
      room: serializeRoom(newRoom),
      playerId: socket.id
    });
  });

  // Add Bot to current room
  socket.on('add_bot', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.status !== 'lobby') return;
    if (room.players.size >= 6) return;

    addBotsToRoom(room, 1);
    io.to(currentRoomCode).emit('room_updated', { room: serializeRoom(room) });
  });

  // Remove Bots
  socket.on('remove_bots', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.status !== 'lobby') return;

    for (const [id, player] of room.players.entries()) {
      if (player.isBot) {
        room.players.delete(id);
      }
    }
    // Re-index lanes
    let l = 0;
    room.players.forEach(p => { p.lane = l++; });

    io.to(currentRoomCode).emit('room_updated', { room: serializeRoom(room) });
  });

  // Join Room
  socket.on('join_room', ({ roomCode, playerName, carColorIndex }) => {
    const formattedCode = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(formattedCode);

    if (!room) {
      return socket.emit('join_error', { message: 'Room not found. Check code and try again.' });
    }

    if (room.players.size >= 6) {
      return socket.emit('join_error', { message: 'Room is full (max 6 racers).' });
    }

    if (room.status === 'racing' || room.status === 'countdown') {
      return socket.emit('join_error', { message: 'Race already in progress in this room.' });
    }

    const lane = room.players.size;
    const colorIdx = carColorIndex !== undefined ? carColorIndex : lane % CAR_COLORS.length;
    const selectedColor = CAR_COLORS[colorIdx % CAR_COLORS.length];

    const player = {
      id: socket.id,
      name: playerName ? playerName.trim().substring(0, 16) : `Pilot ${room.players.size + 1}`,
      color: selectedColor,
      colorIndex: colorIdx % CAR_COLORS.length,
      lane: lane,
      isHost: false,
      isReady: false,
      isBot: false,
      progress: 0,
      charsTyped: 0,
      wpm: 0,
      accuracy: 100,
      speedKmh: 0,
      finished: false,
      finishTime: null,
      rank: null
    };

    room.players.set(socket.id, player);
    currentRoomCode = formattedCode;
    socket.join(formattedCode);

    socket.emit('room_joined', {
      roomCode: formattedCode,
      room: serializeRoom(room),
      playerId: socket.id
    });

    io.to(formattedCode).emit('room_updated', { room: serializeRoom(room) });
  });

  // Update Profile
  socket.on('update_profile', ({ name, carColorIndex }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.status !== 'lobby') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    if (name) player.name = name.trim().substring(0, 16);
    if (carColorIndex !== undefined) {
      player.colorIndex = carColorIndex % CAR_COLORS.length;
      player.color = CAR_COLORS[player.colorIndex];
    }

    io.to(currentRoomCode).emit('room_updated', { room: serializeRoom(room) });
  });

  // Toggle Ready
  socket.on('toggle_ready', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.status !== 'lobby') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    player.isReady = !player.isReady;
    io.to(currentRoomCode).emit('room_updated', { room: serializeRoom(room) });
  });

  // Start Race
  socket.on('start_race', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.status !== 'lobby') return;

    room.status = 'countdown';
    room.sentence = getRandomSentence();

    let laneCounter = 0;
    room.players.forEach((p) => {
      p.lane = laneCounter++;
      p.progress = 0;
      p.charsTyped = 0;
      p.wpm = 0;
      p.accuracy = 100;
      p.speedKmh = 0;
      p.finished = false;
      p.finishTime = null;
      p.rank = null;
    });

    io.to(currentRoomCode).emit('race_countdown_started', {
      room: serializeRoom(room)
    });

    let count = 3;
    const countdownInterval = setInterval(() => {
      io.to(currentRoomCode).emit('countdown_tick', { count });
      count--;
      if (count < 0) {
        clearInterval(countdownInterval);
        room.status = 'racing';
        room.startTime = Date.now();
        io.to(currentRoomCode).emit('race_started', {
          room: serializeRoom(room),
          startTime: room.startTime
        });

        // Start Bot Simulation Engine
        startBotSimulation(room, currentRoomCode);
      }
    }, 1000);
  });

  // Real-time typing update
  socket.on('typing_update', ({ charsTyped, totalChars, wpm, accuracy, speedKmh }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.status !== 'racing') return;

    const player = room.players.get(socket.id);
    if (!player || player.finished) return;

    player.charsTyped = charsTyped;
    const progress = Math.min(100, Math.round((charsTyped / totalChars) * 100));
    player.progress = progress;
    player.wpm = Math.max(0, Math.round(wpm || 0));
    player.accuracy = Math.round(accuracy || 100);
    player.speedKmh = Math.max(0, Math.round(speedKmh || player.wpm * 2.2));

    if (progress >= 100 && !player.finished) {
      handlePlayerFinish(room, player, currentRoomCode);
    }

    socket.to(currentRoomCode).emit('opponent_progress', {
      playerId: player.id,
      progress: player.progress,
      wpm: player.wpm,
      speedKmh: player.speedKmh,
      accuracy: player.accuracy,
      finished: player.finished
    });
  });

  // Rematch / Play Again
  socket.on('play_again', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id) return;

    if (room.botInterval) clearInterval(room.botInterval);

    room.status = 'lobby';
    room.sentence = getRandomSentence();
    room.startTime = null;
    room.players.forEach(p => {
      p.progress = 0;
      p.charsTyped = 0;
      p.wpm = 0;
      p.accuracy = 100;
      p.speedKmh = 0;
      p.finished = false;
      p.finishTime = null;
      p.rank = null;
      p.isReady = p.isHost || p.isBot;
    });

    io.to(currentRoomCode).emit('rematch_initiated', {
      room: serializeRoom(room)
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.players.delete(socket.id);

    const nonBots = Array.from(room.players.values()).filter(p => !p.isBot);
    if (nonBots.length === 0) {
      if (room.botInterval) clearInterval(room.botInterval);
      rooms.delete(currentRoomCode);
    } else {
      if (room.hostId === socket.id) {
        const nextHost = nonBots[0];
        room.hostId = nextHost.id;
        nextHost.isHost = true;
      }
      io.to(currentRoomCode).emit('room_updated', {
        room: serializeRoom(room),
        playerLeft: socket.id
      });
    }
  });
});

function addBotsToRoom(room, count) {
  let added = 0;
  for (let i = 0; i < BOT_NAMES.length && added < count && room.players.size < 6; i++) {
    const template = BOT_NAMES[i];
    const botId = `bot_${template.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}_${i}`;
    if (!room.players.has(botId)) {
      const lane = room.players.size;
      const col = CAR_COLORS[template.colorIdx % CAR_COLORS.length];
      room.players.set(botId, {
        id: botId,
        name: template.name,
        color: col,
        colorIndex: template.colorIdx,
        lane: lane,
        isHost: false,
        isReady: true,
        isBot: true,
        targetWpm: template.wpm,
        progress: 0,
        charsTyped: 0,
        wpm: 0,
        accuracy: 98,
        speedKmh: 0,
        finished: false,
        finishTime: null,
        rank: null
      });
      added++;
    }
  }
}

function startBotSimulation(room, roomCode) {
  if (room.botInterval) clearInterval(room.botInterval);

  const totalChars = room.sentence.length;

  room.botInterval = setInterval(() => {
    if (room.status !== 'racing') {
      clearInterval(room.botInterval);
      return;
    }

    const elapsedMin = Math.max(0.01, (Date.now() - room.startTime) / 60000);

    room.players.forEach(p => {
      if (p.isBot && !p.finished) {
        // Human-like speed variance (+/- 10%)
        const variance = (Math.sin(Date.now() / 1500 + p.lane) * 0.15) + 1;
        const currentWpm = Math.round(p.targetWpm * variance);
        p.wpm = currentWpm;
        p.speedKmh = Math.round(currentWpm * 2.2);

        // Chars typed = wpm * 5 * elapsedMin
        const targetChars = Math.min(totalChars, Math.round(p.targetWpm * 5 * elapsedMin * variance));
        p.charsTyped = targetChars;
        p.progress = Math.min(100, Math.round((targetChars / totalChars) * 100));

        if (p.progress >= 100 && !p.finished) {
          handlePlayerFinish(room, p, roomCode);
        }

        io.to(roomCode).emit('opponent_progress', {
          playerId: p.id,
          progress: p.progress,
          wpm: p.wpm,
          speedKmh: p.speedKmh,
          accuracy: p.accuracy,
          finished: p.finished
        });
      }
    });

  }, 250);
}

function handlePlayerFinish(room, player, roomCode) {
  player.finished = true;
  player.finishTime = ((Date.now() - room.startTime) / 1000).toFixed(2);

  const finishedCount = Array.from(room.players.values()).filter(p => p.finished).length;
  player.rank = finishedCount;

  io.to(roomCode).emit('player_finished', {
    playerId: player.id,
    playerName: player.name,
    rank: player.rank,
    finishTime: player.finishTime,
    wpm: player.wpm,
    accuracy: player.accuracy
  });

  const allDone = Array.from(room.players.values()).every(p => p.finished);
  if (allDone) {
    room.status = 'finished';
    if (room.botInterval) clearInterval(room.botInterval);
    io.to(roomCode).emit('race_completed', {
      room: serializeRoom(room)
    });
  }
}

function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    sentence: room.sentence,
    startTime: room.startTime,
    players: Array.from(room.players.values())
  };
}

server.listen(PORT, () => {
  console.log(`>>> Cyber Nitro Racing Server running at http://localhost:${PORT}`);
});
