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

function getMessages (callback) {
  conn.query(
    'SELECT * ' +
    'FROM messages',
    []
  ).then(callback)
  .catch((err) => {
    console.log(err)
  })
}

function createMessage (content) {
  const socket = this
  const username = 'Anon'

  content = String(content).trim()
  if (content.length === 0) return

  conn.query(
    'INSERT INTO messages (username, content) VALUES (?,?)',
    [username, content]
  ).then((result) => {
    const message = {
      id: result.insertId,
      username,
      content,
      upvotes: 0
    }

    console.log('message:create', socket.id, content)
    io.sockets.emit('message:create', message)
  })
  .catch((err) => { console.log(err) })
}

function upvoteMessage (messageId) {
  const socket = this

  conn.query(
    'UPDATE messages ' +
    'SET upvotes = upvotes + 1 ' +
    'WHERE id = ?',
    [messageId]
  ).then((result) => {
    console.log('message:upvote', socket.id, messageId)
    io.sockets.emit('message:upvote', socket.id, messageId)
  })
  .catch((err) => { console.log(err) })
}

io.on('connection', (socket) => {
  getMessages(function (messages) {
    socket.emit('bootstrap', socket.id, messages)
  })
  socket.on('message:create', createMessage)
  socket.on('message:upvote', upvoteMessage)
})

http.listen(port, function () {
  console.log(`listening on ${ip.address()}:${port}`)
})
