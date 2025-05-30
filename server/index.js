const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // Geliştirme için serbest
  }
});

const rooms = {};

function genCode(len = 4) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  while (s.length < len) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  socket.on('sendMessage', msg => {
    const rc = msg.room;
    console.log(rc)
    if (!rc) return;
    io.to(rc).emit('message', msg);
  });


  socket.on('typingStart1', (username) => {
    socket.broadcast.emit('typingStart', username)
  })

  socket.on('typingStop', (username) => {
    socket.broadcast.emit('typingStop', username)
  })

  socket.on('createRoom', username => {
    const code = genCode();
    rooms[code] = { players: [socket.id], usernames: [{ id: socket.id, username: username }] };
    socket.join(code);
    socket.emit('roomCreated', code);
    console.log(`🔨 Room ${code} created by ${username}`);
  });

  // —— 2) ODAYA KATILMA ——
  socket.on('joinRoom', ({ username, roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      return socket.emit('err', 'Oda bulunamadı.');
    }
    if (room.players.length >= 2) {
      return socket.emit('err', 'Oda dolu.');
    }
    room.players.push(socket.id);
    room.usernames.push({id:socket.id,username:username})
    socket.join(roomCode);
    socket.emit('roomJoined', roomCode);
    // diğerine bildir
    io.to(roomCode).emit('userJoined', room);
    console.log(`🚪 ${username} joined room ${roomCode}`);
    console.log(`🚪 ${username} joined room ${room}`);
  });




  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(socket.username + " ayrıldı")
      socket.broadcast.emit('userLogout', {
        username: socket.username,
      });
    }
  });
});

server.listen(3000, () => {
  console.log('Sunucu 3000 portunda çalışıyor.');
});
