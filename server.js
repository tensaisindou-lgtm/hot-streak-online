const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true }));

const rooms = new Map();
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const PUBLIC_DECK_SIZE = 14;
const HAND_SIZE = 3;

const runners = ['gobura', 'mum', 'harley', 'dunkle'];

function shuffle(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

function createSourceDeck() {
  const deck = [];
  for (const id of runners) {
    deck.push({type:'move',target:id,amount:1},{type:'move',target:id,amount:2},{type:'move',target:id,amount:3});
    deck.push({type:'star',target:id});
    deck.push({type:'fall',target:id});
    deck.push({type:'move',target:id,amount:-2});
    deck.push({type:'stumble',target:id,amount:1,stumbleDirection:'inner'});
    deck.push({type:'stumble',target:id,amount:1,stumbleDirection:'inner'});
    deck.push({type:'stumble',target:id,amount:2,stumbleDirection:'right'});
    deck.push({type:'stumble',target:id,amount:2,stumbleDirection:'left'});
    deck.push({type:'stumble',target:id,amount:3,stumbleDirection:'outer'});
    deck.push({type:'turn',target:id});
    deck.push({type:'heal',target:id});
  }
  deck.push({type:'allMove',amount:1},{type:'allMove',amount:2},{type:'allMove',amount:3});
  return deck;
}

function newRoom(code, socketId) {
  return {
    code,
    hostId: socketId,
    players: new Map([[socketId, {id: socketId, name: `プレイヤー1`, ready:false}]]),
    phase: 'lobby',
    playerCount: 2,
    publicDeck: [],
    hands: new Map(),
    addedCards: [],
    raceDeck: [],
    discardDeck: [],
    excluded: [],
    drawLock: false,
    lastDrawBy: null
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    playerCount: room.playerCount,
    players: [...room.players.values()].map(p => ({id:p.id,name:p.name,ready:p.ready}))
  };
}

function emitRoom(room) {
  io.to(room.code).emit('room:update', publicRoom(room));
}

function makeCode() {
  let code;
  do code = crypto.randomBytes(3).toString('hex').toUpperCase(); while (rooms.has(code));
  return code;
}

function deal(room) {
  const source = shuffle(createSourceDeck());
  room.publicDeck = source.slice(0, PUBLIC_DECK_SIZE);
  const rest = source.slice(PUBLIC_DECK_SIZE);
  room.hands.clear();
  for (const id of room.players.keys()) room.hands.set(id, shuffle(rest.splice(0, HAND_SIZE)));
  room.addedCards = [];
  room.raceDeck = [];
  room.discardDeck = [];
  room.excluded = [];
  room.phase = 'deck';
}

function startRace(room) {
  room.raceDeck = shuffle([...room.publicDeck, ...room.addedCards]);
  room.discardDeck = [];
  room.excluded = [];
  excludeThree(room);
  room.phase = 'race';
  room.drawLock = false;
  io.to(room.code).emit('game:started', {deckCount: room.raceDeck.length});
}

function excludeThree(room) {
  room.excluded = [];
  for (let i=0; i<3 && room.raceDeck.length; i++) room.excluded.push(room.raceDeck.splice(Math.floor(Math.random()*room.raceDeck.length),1)[0]);
}

function recycle(room) {
  const cards = [...room.discardDeck, ...room.excluded];
  if (!cards.length) return;
  room.raceDeck = shuffle(cards);
  room.discardDeck = [];
  room.excluded = [];
  excludeThree(room);
}

io.on('connection', socket => {
  socket.on('room:create', ({name, playerCount=2}={}) => {
    const count = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Number(playerCount)||2));
    const code = makeCode();
    const room = newRoom(code, socket.id);
    room.playerCount = count;
    room.players.get(socket.id).name = String(name||'ホスト').slice(0,20);
    rooms.set(code, room);
    socket.join(code);
    socket.emit('room:created', {code, playerId:socket.id, isHost:true});
    emitRoom(room);
  });

  socket.on('room:join', ({code,name}={}) => {
    code = String(code||'').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('room:error', 'ルームが見つからないぽよ');
    if (room.phase !== 'lobby') return socket.emit('room:error', 'このルームはすでにゲーム準備中ぽよ');
    if (room.players.size >= room.playerCount) return socket.emit('room:error', '満員ぽよ');
    room.players.set(socket.id, {id:socket.id,name:String(name||`プレイヤー${room.players.size+1}`).slice(0,20),ready:false});
    socket.join(code);
    socket.emit('room:joined', {code, playerId:socket.id, isHost:false});
    emitRoom(room);
  });

  socket.on('room:setReady', ({code,ready}={}) => {
    const room = rooms.get(code); if (!room) return;
    const p = room.players.get(socket.id); if (!p) return;
    p.ready = !!ready;
    emitRoom(room);
  });

  socket.on('game:startSetup', ({code}={}) => {
    const room = rooms.get(code); if (!room || room.hostId !== socket.id) return;
    if (room.players.size < room.playerCount) return socket.emit('room:error', `あと${room.playerCount-room.players.size}人必要ぽよ`);
    if (![...room.players.values()].every(p=>p.ready)) return socket.emit('room:error', '全員READYしてから開始ぽよ');
    deal(room);
    io.to(room.code).emit('deck:public', {cards: room.publicDeck});
    for (const id of room.players.keys()) io.to(id).emit('deck:hand', {cards: room.hands.get(id)});
    emitRoom(room);
  });

  socket.on('deck:choose', ({code,index}={}) => {
    const room = rooms.get(code); if (!room || room.phase !== 'deck') return;
    const hand = room.hands.get(socket.id); if (!hand || !hand[index]) return;
    room.addedCards.push(hand[index]);
    room.hands.set(socket.id, []);
    io.to(socket.id).emit('deck:chosen');
    io.to(room.code).emit('deck:choiceProgress', {chosen: room.addedCards.length, total: room.players.size});
    if (room.addedCards.length === room.players.size) startRace(room);
  });

  socket.on('game:draw', ({code}={}) => {
    const room = rooms.get(code); if (!room || room.phase !== 'race' || room.drawLock) return;
    if (!room.raceDeck.length) recycle(room);
    if (!room.raceDeck.length) return;
    room.drawLock = true;
    const card = room.raceDeck.pop();
    room.discardDeck.push(card);
    room.lastDrawBy = socket.id;
    io.to(room.code).emit('game:card', {card, deckCount:room.raceDeck.length});
  });

  socket.on('game:resolved', ({code}={}) => {
    const room = rooms.get(code); if (!room || !room.drawLock) return;
    if (room.lastDrawBy !== socket.id) return;
    room.drawLock = false;
    io.to(room.code).emit('game:unlock');
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      if (!room.players.has(socket.id)) continue;
      room.players.delete(socket.id);
      room.hands.delete(socket.id);
      if (!room.players.size) rooms.delete(code);
      else { if (room.hostId === socket.id) room.hostId = room.players.keys().next().value; emitRoom(room); }
    }
  });
});

server.listen(PORT, () => console.log(`🔥 HOT STREAK online: http://localhost:${PORT}`));
