'use strict'
const events = require("events")
const emitter = new events.EventEmitter()
const queue = new Map()
let requests = new Map()
let MAX_CONNECTIONS = 500 // Not sure if this works.

const on = (event, callback) => {
  if (event === "dequeue") {
    emitter.addListener("dequeue", (obj) => {
      callback(obj)
    })
  } else if (event === "enqueued") {
    emitter.addListener("enqueued", (obj) => {
      callback(obj)
    })
  }
}

const respond = () => {
  requests = Math.max(0, requests-1)
}

const enqueue = (obj) => {
  const url = obj.url
  let reqs = requests.get(url.host) || []
  if (reqs.length === 0 || obj.options.delay_ms === 0) {
    dequeue(obj)
    return
  }
  const qobj = queue.get(url.host) || {}
  let q = qobj.queue || []
  const lastdq = qobj.lastdq || 0

  q.push(obj)
  queue.set(url.host, {queue:q, lastdq})
}

const dequeue = (obj) => {
  const url = obj.url
  let reqs = requests.get(url.host) || []
  const qobj = queue.get(obj.url.host) || {}
  let q = qobj.queue || []
  let lastdq = qobj.lastdq || 0
  let now = Date.now()
  if (now - lastdq < obj.options.delay_ms) {
    setTimeout(() => {
      emitter.emit("dequeue", obj)
    }, obj.options.delay_ms - (now - lastdq))
  } else {
    process.nextTick(() => { emitter.emit("dequeue", obj) })
  }
  lastdq = Date.now()
  queue.set(url.host, {queue:q, lastdq})
  reqs.push(url)
  requests.set(url.host, reqs)
}

const cancel = (obj) => {
  let url = new URL(obj.url.href)
  queue.set(url.host, [])
}

module.exports = {
  enqueue,
  on,
  respond,
  cancel
}