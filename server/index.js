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

const rooms = [];

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
    console.log(rc + " odasına " + msg.username + " tarafından mesaj geldi")
    if (!rc) return;
    io.to(rc).emit('message', msg);
  });

  socket.on('createRoom', username => {
    socket.username = username;
    const code = genCode();
    rooms.push({ id: code, users: [{ id: socket.id, username: username }] });
    socket.join(code); // Odayı oluşturan kullanıcıyı kurduğu odaya dahil ettik.
    socket.userRoom = code;
    const room = rooms.find(room => room.id == code)
    socket.emit('roomCreated', room);
    console.log(`🔨 Room ${code} created by ${username}`);
  });

  socket.on('joinRoom', ({ username, roomCode }) => {
    socket.username = username;
    const room = rooms.find(room => room.id == roomCode)
    if (!room) {
      return socket.emit('err', 'Oda bulunamadı.');
    }
    if (room.users.length >= 2) {
      return socket.emit('err', 'Oda dolu.');
    }


    room.users.push({ id: socket.id, username: username }) // Kullanıcıyı room değişkenine ekledik
    socket.join(roomCode); // Kullanıcıyı odaya dahil ettik
    socket.userRoom = roomCode;

    socket.emit('roomJoined', room);
    // diğerine bildir
    io.to(roomCode).emit('someoneJoined', room);


    console.log(`🚪 ${username} joined room ${roomCode}`);
  });




  socket.on('disconnect', (reason) => {
    console.log(`❌ Disconnect tetiklendi! socket.id=${socket.id}`, 'Sebep:', reason);
    console.log('Socket.username:', socket.username, " odası : " + socket.userRoom);
    if (socket.username) {
      const roomCode = socket.userRoom;
      if (!roomCode) return;
      const idx = rooms.findIndex(room => room.id == socket.userRoom)
      if (idx == -1) return;

      const room = rooms[idx];
      room.users = room.users.filter(u => u.username !== socket.username)

      if (room.users.length === 0) {
        rooms.splice(idx, 1);
      }else{
        io.to(socket.userRoom).emit('someoneLeaved', room);
        console.log(`${socket.username} ayrılıyor, broadcast yapıyorum.`);
        socket.broadcast.emit('userLogout', { username: socket.username });
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Sunucu 3000 portunda çalışıyor.');
});
