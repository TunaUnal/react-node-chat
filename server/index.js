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

function genCode(len = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  while (s.length < len) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  socket.on('join', (username) => {
    socket.username = username;
    socket.broadcast.emit('userLogin', {
      username: username
    });
  });

  socket.on('sendMessage', (message) => {
    io.emit('message', message);
  });

  socket.on('typingStart1', (username) => {
    socket.broadcast.emit('typingStart', username)
  })

  socket.on('typingStop', (username) => {
    socket.broadcast.emit('typingStop', username)
  })

  socket.on('createRoom', username => {
    const code = genCode();
    rooms[code] = { players: [socket.id], usernames: { [socket.id]: username } };
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
    room.usernames[socket.id] = username;
    socket.join(roomCode);
    socket.emit('roomJoined', roomCode);
    // diğerine bildir
    socket.to(roomCode).emit('userJoined', username);
    console.log(`🚪 ${username} joined room ${roomCode}`);
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
