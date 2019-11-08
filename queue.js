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

const respond = (url) => {
  let reqs = requests.get(url.host) || []
  const qobj = queue.get(url.host) || {}
  let q = qobj.queue || []
  const lastdq = qobj.lastdq || 0
  let next = q.shift()
  queue.set(url.host, {queue:q, lastdq})
  if (next) {
    reqs.push(next.url)
    requests.set(next.url.host, [next.url])
    dequeue(next)
  }
}

const enqueue = (obj) => {
  const url = obj.url
  let reqs = requests.get(url.host) || []
  const qobj = queue.get(url.host) || {}
  let q = qobj.queue || []
  const lastdq = qobj.lastdq || 0
  q.push(obj)
  queue.set(url.host, {queue:q, lastdq})
  if (q.length === 1 || obj.options.delay_ms === 0) {
    dequeue(obj)
  }
}

const dequeue = (obj) => {
  const url = obj.url
  const qobj = queue.get(obj.url.host)
  let lastdq = qobj.lastdq || 0
  let now = Date.now()
  console.log(now-lastdq, obj.options.delay_ms)
  if (now - lastdq < obj.options.delay_ms) {
    setTimeout(() => {
      emitter.emit("dequeue", obj)
    }, obj.options.delay_ms - (now - lastdq))
  } else {
    emitter.emit("dequeue", obj)
  }
  queue.set(url.host, Object.assign(qobj, {lastdq: now}))
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