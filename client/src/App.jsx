import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Socket.io sunucu adresinizi buraya yazın
const socket = io('http://localhost:3000');

// Üst bar bileşeni
function ChatHeader({ username, users }) {
  return (
    <div className="chat-header">
      <h2>Chat Uygulaması</h2>
      <div className="user-list">
        Kullanıcılar: <strong>Sen ({username})</strong>{users.length > 0 && ", "}
        {users.map((u, i) => (
          <span key={i}>{u.username}{i < users.length - 1 ? ', ' : ''}</span>
        ))}
      </div>
    </div>
  );
}

// Tek bir mesaj balonu bileşeni
function MessageBubble({ text, user, username, delivered }) {
  const isUser = user === username;
  const bubbleclassName = isUser ? 'message user' : 'message other';
  return (
    <div className={bubbleclassName} title={delivered ? 'Teslim edildi' : 'Gönderiliyor'}>
      {text}
    </div>
  );
}

// Mesaj listesi bileşeni
function MessageList({ messages, username }) {
  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          text={msg.text}
          user={msg.user}
          username={username}
          delivered={msg.delivered}
        />
      ))}
    </div>
  );
}

// Mesaj giriş kutusu bileşeni
function ChatInput({ message, setMessage, sendMessage }) {
  return (
    <form className="chat-input-area" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
      <input
        type="text"
        className="chat-input"
        placeholder="Mesajınızı yazın..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button type="submit" className="send-button">➤</button>
    </form>
  );
}

// Ana sohbet uygulaması bileşeni
export default function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState([])
  const [mode, setMode] = useState('init');       // init | joining | chatting
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // 1) Mesaj geldiğinde aşağı kaydır
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

    socket.on('roomCreated', code => {
      setRoomCode(code);
      setMode('chatting');
      setError('');
    });

    // odaya başarılı katılma
    socket.on('roomJoined', code => {
      setRoomCode(code);
      setMode('chatting');
      setError('');
    });

    socket.on('userJoined', room => {
      setUsers(room.usernames);
    })

    socket.on('typingStart', (typingUser) => {
      setTypingUser((user) => {
        if (user.includes(typingUser)) return user;  // Aynı kullanıcı tekrar eklenmesin
        return [...user, typingUser];
      });
    });

    socket.on('typingStop', (typingUser) => {
      setTypingUser((user) => user.filter((u) => u !== typingUser));
    });

    return () => {
      socket.off('message');
      socket.off('userLogin');
      socket.off('userLogout');
    };
  }, []);

  const joinChat = () => {
    if (username.trim()) {
      socket.emit('join', username);
      setJoined(true);
    }
  };

  const type = (msg) => {
    if (username.trim()) {
      if (msg.trim() == "") {
        typeEnd()
      } else {
        socket.emit('typingStart1', username)
      }
    }
  }

  const typeEnd = () => {
    if (username.trim()) {
      socket.emit('typingStop', username)
    }
  }
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
      room:roomCode
    };
    // Optimistic UI
    setMessages((prev) => [...prev, msgObj]);
    socket.emit('sendMessage', msgObj);
    typeEnd();
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
                <h5 className="mb-0">ChatRoom (Room {roomCode}) </h5>
                <div>
                  Aktif Kullanıcılar: <strong>Sen ({username})</strong>{users.length > 0 && ", "}
                  {users.map((u, i) => (
                    <span key={i}>{u.username}{i < users.length - 1 ? ', ' : ''}</span>
                  ))}
                </div>
              </div>
              <div className="card-body" data-mdb-perfect-scrollbar-init style={{ position: "relative", height: "400px" }}>

                {messages.map((msg) => (

                  <>
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

                  </>
                ))}

                {typingUser.length > 0 && (

                  <p>
                    {typingUser.map((u, i) => (

                      <>{u}{i < typingUser.length - 1 ? ', ' : ''}</>
                    ))} yazıyor...
                  </p>
                )}
                <div ref={messagesEndRef} />




                {/*<div className="divider d-flex align-items-center mb-4">
                  <p className="text-center mx-3 mb-0" style={{ color: "#a2aab7" }}>Today</p>
                </div>*/}


              </div>
              <div className="card-footer text-muted d-flex justify-content-start align-items-center p-3">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className='w-100'>

                  <input type="text" className="form-control form-control-lg w-100" id="exampleFormControlInput1"
                    placeholder="Type message" value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyUp={e => type(e.target.value)} />
                </form>
                <a className="ms-1 text-muted" href="#!"><i className="fas fa-paperclip"></i></a>
                <a className="ms-3 text-muted" href="#!"><i className="fas fa-smile"></i></a>
                <a className="ms-3" href="#!"><i className="fas fa-paper-plane"></i></a>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
/*
<ChatHeader username={username} users={users} />
<MessageList messages={messages} username={username} />
<ChatInput message={message} setMessage={setMessage} sendMessage={sendMessage} />
                    <p className="small ms-3 mb-3 rounded-3 text-muted">23:58</p>

*/