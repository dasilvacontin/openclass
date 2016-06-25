'use strict'
const fs = require('fs')
const onDeath = require('death')

onDeath(_ => { process.exit() })

function saveStore(file, store) {
  console.log(`noobdb: saving DB to ${file}...`)
  fs.writeFileSync(file, JSON.stringify(store))
}

module.exports = function noobdb (file, defaultObj) {
  let store = defaultObj

  try {
    console.log(`noobdb: reading DB from ${file}...`)
    store = JSON.parse(fs.readFileSync(file))
  } catch (e) {
    console.log(`failed to load ${file}: ${e.message}`)
    saveStore(file, store)
  }

  process.on('exit', _ => { saveStore(file, store) })
  return store
}
