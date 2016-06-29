'use strict'
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const ip = require('ip')
const mysql = require('promise-mysql')
const url = require('url')

const port = process.env.PORT || 3000
const { host, auth, pathname } = url.parse(process.env.CLEARDB_DATABASE_URL)
const [user, password] = auth.split(':')
const database = pathname.slice(1)
const config = { host, user, password, database }

let conn = null
mysql.createConnection(config)
.then((connection) => {
  conn = connection
  console.log('successfully connected to DB')
  conn.query(
    'CREATE TABLE IF NOT EXISTS messages (' +
    'id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
    'created TIMESTAMP DEFAULT NOW(),' +
    'username VARCHAR(16) NOT NULL,' +
    'content VARCHAR(140) NOT NULL,' +
    'upvotes INT(70) NOT NULL DEFAULT 0)'
  )
})
.catch((err) => {
  console.log(err)
  process.exit()
})

app.use(express.static('.'))
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

function getMessages(callback) {
  conn.query(
    'SELECT * ' +
    'FROM messages',
    []
  ).then((messages) => {
    callback(messages)
  })
  .catch((err) => {
    console.log(err)
  })
}

function saveMessage(username, content) {
  conn.query(
    'INSERT INTO messages (username, content) VALUES (?,?)',
    [username, content]
  ).then((result) => {
    const message = {
      id: result.insertId,
      username: username,
      content: content,
      upvotes: 0
    }
    io.sockets.emit('message:create', message)
  })
  .catch((err) => {
    console.log(err)
  })
}

function upvoteMessage(messageId) {
  console.log('upvoting',messageId)
  conn.query(
    'UPDATE messages ' +
    'SET upvotes = upvotes + 1 ' +
    'WHERE id = ?',
    [messageId]
  ).then((result) => {
    console.log(result)
  })
  .catch((err) => {
    console.log(err)
  })
}

io.on('connection', (socket) => {
  getMessages(function (messages) {
    socket.emit('bootstrap', socket.id, messages)
  })

  socket.on('message:create', (value) => {
    console.log('message:create', socket.id, value)
    value = String(value).trim()
    if (value.length === 0) return

    saveMessage('Anon', value)
  })

  socket.on('message:upvote', (messageId) => {
    console.log('message:upvote', socket.id, messageId)
    console.log(socket.conn.remoteAddress)
    upvoteMessage(messageId)

    io.sockets.emit('message:upvote', messageId, socket.id)
  })
})

http.listen(port, function () {
  console.log(`listening on ${ip.address()}:${port}`)
})
