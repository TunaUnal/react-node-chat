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
