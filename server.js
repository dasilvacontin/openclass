'use strict'
const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const ip = require('ip')
const port = process.env.PORT || 3000
const noobdb = require('./noobdb.js')
const messages = noobdb('db.json', [])

const _log = console.log
console.log = function () {
  const d = new Date()
  const args = Array.from(arguments)
  const timestamp = '[' + d.toLocaleString().split(' ').slice(0, 2).join(' ') + ']'
  _log.apply(console, [timestamp].concat(args))
}

app.use(express.static('.'))
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', (socket) => {
  socket.emit('bootstrap', socket.id, messages)

  socket.on('message:create', (value) => {
    console.log('message:create', socket.id, value)
    value = String(value).trim()
    if (value.length === 0) return

    const message = {
      id: messages.length,
      timestamp: Date.now(),
      username: 'Anon',
      content: value,
      upvotes: 0
    }
    messages.push(message)

    io.sockets.emit('message:create', message)
  })

  socket.on('message:upvote', (messageId) => {
    console.log('message:upvote', socket.id, messageId)
    console.log(socket.conn.remoteAddress)
    const message = messages[messageId]
    if (!message) return console.log('upvoted unexisting message')

    message.upvotes++
    io.sockets.emit('message:upvote', messageId, socket.id)
  })
})

http.listen(port, function () {
  console.log(`listening on ${ip.address()}:${port}`)
})
