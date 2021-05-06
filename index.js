const express = require('express');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*'
  }
});

//приложение может принимать json данные
app.use(express.json());
const rooms = new Map();

app.get('/rooms/:id', (req, res) => {
  const { id: roomId } = req.params;
  //проверяем есть ли комната
  const obj = rooms.has(roomId) ? {
    users: [...rooms.get(roomId).get('users').values()],
    messages: [...rooms.get(roomId).get('messages').values()]
  } : { users: [], messages: [] };

  res.json(obj);
});

app.post('/rooms', (req, res) => {
  const { roomId, userName } = req.body;
  //если нет такой комнаты, то мы её создаем
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map([
      ['users', new Map()],
      ['messages', []],
    ]))
  }
  res.send();
})

io.on('connection', (socket) => {
  socket.on('ROOM:JOIN', ({ roomId, userName }) => {
    socket.join(roomId);
    //получем конкретного пользователя в конкретной комнате
    rooms.get(roomId).get('users').set(socket.id, userName);
    //сохраняем нашего пользователя
    const users = [...rooms.get(roomId).get('users').values()];
    //отправляем запрос о подключении нового пользователя остальным
    socket.broadcast.to(roomId).emit('ROOM:SET_USERS', users);
  });

  socket.on('ROOM:NEW_MESSAGE', ({ roomId, userName, text, date }) => {
    const obj = {
      userName,
      text,
      date: new Date().toLocaleTimeString()
    }

    rooms.get(roomId).get('messages').push(obj);
    socket.broadcast.to(roomId).emit('ROOM:NEW_MESSAGE', obj);
  });

  socket.on('disconnect', () => {
    rooms.forEach((value, roomId) => {
      if (value.get('users').delete(socket.id)) {
        const users = [...value.get('users').values()];
        socket.broadcast.to(roomId).emit('ROOM:SET_USERS', users);
      }
    });
  });
})

server.listen(3333, () => {
  console.log('Соединение установлено');
})