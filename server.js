const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes')
const User = require('./models/User');
const Message = require('./models/Message')
const rooms = ['general', 'tech', 'finance', 'crypto'];
const cors = require('cors');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use('/users', userRoutes)
require('./connection')

const server = require('http').createServer(app);
const PORT = process.env.PORT_NUMBER;


const io = require('socket.io')(server, {
  cors: {
    origin: process.env.ORIGIN,
    methods: ['GET', 'POST']
  }
})


async function getLastMessagesFromRoom(room) {
  let roomMessages = await Message.aggregate([
    { $match: { to: room } },
    { $group: { _id: '$date', messagesByDate: { $push: '$$ROOT' } } } // Dobice se niz objekata. Savaki od tih objekata ce imati _id properti (value ce biti $date) i messagesByDate properti (value ce biti niz, jer se koristi $push)
  ])

  return roomMessages;
}


function sortRoomMessagesByDate(messages) {
  return messages.sort(function (a, b) {
    let date1 = a._id.split('/');
    let date2 = b._id.split('/');

    date1 = date1[2] + date1[0] + date1[1]
    date2 = date2[2] + date2[0] + date2[1];

    return date1 < date2 ? -1 : 1
  })
}

io.on('connection', (socket) => {
  // console.log(`User Connected: ${socket.id}`); 

  socket.on('new-user', async () => {// u Login.js se emituje 'new-user', a ovde se osluskuje 'new-user, pronalaze se svi useri iz baze, i emituje se 'new-user'. Na frontendu SideBar.js se osluckuje 'new-user' cime se dobija update lista usera.
    const members = await User.find();
    io.emit('new-user', members) // io.emit znaci da se emituje ka svim (bas svim) userima, cak i nama/samom sebi.
  })

  

  socket.on('join-room', async (newRoom, previousRoom) => {
    console.log('previous Room je *server.js, : ', previousRoom)
    socket.join(newRoom); /// join u dati room
    socket.leave(previousRoom); // jako bitna linija koda
    let roomMessages = await getLastMessagesFromRoom(newRoom);
    roomMessages = sortRoomMessagesByDate(roomMessages);

  
    socket.emit('room-messages', roomMessages) // iznad imamo socket.join i socket.leave. Ovde se emituje samo nama/samom sebi tj. onom useru koji zeli da ucje u sobu. OBAVEZNO PROBATI => io.to(newRomm).emit('room-messages', roomMessages) -> to ce biti manje optimalno resenje u odnsu na prethodno, ali ce raditi. Sa prethodnim resenjem roomMessages dobija user koji se uloguje, a sa ovim bi svi useri dobijali roomMessages kad god se neki user uloguje. 


    // io.to(newRoom).emit('room-messages', roomMessages) // emituje se svima koji su u datoj sobi i samom sebi. Gornje resenje je bolje ali i ovo radi.
    // socket.to(newRoom).emit('room-messages', roomMessages) // emituje se svima koji su u datoj sobi ali ne i samom sebi // ovo resenje nece raditi

  })

  socket.on('message-room', async (room, content, sender, time, date) => {
    const newMessage = await Message.create({ content, from: sender, time, date, to: room });
    let roomMessages = await getLastMessagesFromRoom(room);

    roomMessages = sortRoomMessagesByDate(roomMessages);
    // sending message to room

    io.to(room).emit('room-messages', roomMessages); // Emituje se svima koji su u toj sobi, cak i samm sebi. Probati za vezbu da se umesto ovoga stavi sldeca linija koda:
    // socket.to(room).emit('room-messages', roomMessages) // sa ovim se emituje svima osim nas/samom sebi i ovo nije dobro
    socket.broadcast.emit('notifications', room) // salju se notiikacije svima osim nas/samom sebi
  })

  app.delete('/logout', async (req, res) => {
    try {
      const { _id, newMessages } = req.body;
      const user = await User.findById(_id);
      user.status = "offline";
      user.newMessages = newMessages;
      await user.save();
      const members = await User.find();
      socket.broadcast.emit('new-user', members);
      res.status(200).send();
    } catch (e) {
      console.log(e);
      res.status(400).send()
    }
  })

})


app.get('/rooms', (req, res) => {
  res.json(rooms)
})


server.listen(PORT, () => {
  console.log('Start...')
})
