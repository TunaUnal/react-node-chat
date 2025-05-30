import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Socket.io sunucu adresinizi buraya yazın
const socket = io('http://localhost:3000');

export default function App() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('init');       // init | joining | chatting
  const [room, setRoom] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    socket.on('message', (msg) => {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id);
        if (exists) {
          return prev.map((m) =>
            m.id === msg.id ? { ...m, delivered: true } : m
          );
        }
        return [...prev, { ...msg, delivered: true }];
      });
    });

    socket.on('roomCreated', getRoom => {
      console.log("Sunucudan haber geldi. Oda oluşturuldu.");
      setRoom(getRoom);
      setMode('chatting');
      setError('');
    });
    
    socket.on('roomJoined', getRoom => {
      console.log("Sunucudan haber geldi. Odaya katıldık. Room : ");
      console.log(getRoom);
      
      setRoom(getRoom);
      setMode('chatting');
      setError('');
    });

    socket.on('someoneJoined', getRoom => {
      setRoom(getRoom);
    })

    socket.on('someoneLeaved', getRoom => {
      setRoom(getRoom);
    })

    return () => {
      socket.off('message');
      socket.off('userLogin');
      socket.off('userLogout');
    };
  }, []);

  const createRoom = () => {
    if (!username.trim()) return setError('Ad gir!');
    socket.emit('createRoom', username);
  };
  const startJoin = () => {
    if (!username.trim()) return setError('Ad gir!');
    setMode('joining');
    setError('');
  };
  const joinRoom = () => {
    if (!joinInput.trim()) return setError('Kod gir!');
    socket.emit('joinRoom', { username, roomCode: joinInput.trim() });

  };
  const sendMessage = () => {
    if (!message.trim()) return;
    const msgObj = {
      id: `${Date.now()}_${Math.random()}`,
      user: username,
      text: message,
      delivered: false,
      room:room.id,
      type:"msg"
    };

    setMessages((prev) => [...prev, msgObj]);
    
    socket.emit('sendMessage', msgObj);
    setMessage('');
  };

  if (mode === 'init') {
    return (
      <div className="init-screen">
        <h2>Adın?</h2>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Bir isim gir" />
        <div>
          <button onClick={createRoom}>Create Room</button>
          <button onClick={startJoin}>Join Room</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (mode === 'joining') {
    return (
      <div className="join-screen">
        <h2>Oda Kodu:</h2>
        <input
          value={joinInput}
          onChange={e => setJoinInput(e.target.value)}
          placeholder="Örn: ABC123" />
        <button onClick={joinRoom}>Join</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <section>
      <div className="container py-5">

        <div className="row d-flex justify-content-center">
          <div className="col-md-10 col-lg-8 col-xl-6">

            <div className="card" id="chat2">
              <div className="card-header p-3">
                <h5 className="mb-0">ChatRoom (Room {room.id}) </h5>
                <div>
                  Aktif Kullanıcılar: <strong>Sen ({username})</strong>{room.users.length > 0 && ", "}
                  {room.users.filter(usr=>usr.username !== username).map((u, i) => (
                    <span key={i}>{u.username}{i < room.users.length - 2 ? ', ' : ''}</span>
                  ))}
                </div>
              </div>
              <div className="card-body" data-mdb-perfect-scrollbar-init style={{ position: "relative", height: "400px" }}>

                {messages.map((msg) => (

                    <div key={msg.id} className={`d-flex flex-row justify-content-${msg.user == username ? "end" : "start"}`}>
                      <div>
                        <p className={`small p-2 mb-1 rounded-3 ${msg.user == username ? "text-white  bg-primary" : "bg-body-tertiary"}  `}>
                          {msg.user !== username && (
                            <strong>
                              {msg.user} :
                            </strong>
                          )}
                          {msg.text}
                        </p>
                      </div>
                    </div>

                ))}

                <div ref={messagesEndRef} />

                {/*<div className="divider d-flex align-items-center mb-4">
                  <p className="text-center mx-3 mb-0" style={{ color: "#a2aab7" }}>Today</p>
                </div>*/}

              </div>
              <div className="card-footer text-muted d-flex justify-content-start align-items-center p-3">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} autoComplete="off"   className='w-100'>
                  <input type="text" className="form-control form-control-lg w-100" id="exampleFormControlInput1"
                    placeholder="Type message" value={message}
                    autoComplete="off"  
                    onChange={(e) => setMessage(e.target.value)}/>
                </form>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
