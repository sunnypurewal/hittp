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
  if (obj.options.delay_ms === 0) {
    dequeue(obj)
    return
  }
  const url = obj.url
  const qobj = queue.get(url.host) || {}
  let queue = qobj.queue || []
  const lastdq = qobj.lastdq || 0

  queue.push(obj)
  
  queue.set(url.host, {queue, lastdq})
  emitter.emit("enqueued", obj)
}

const dequeue = (obj) => {
  if (emitter.listenerCount("dequeue") === 0) {
    return
  }
  if (requests > MAX_CONNECTIONS) {
    enqueue(obj)
    return
  }
  const qobj = queue.get(obj.url.host)
  let count = qobj.count
  let lastdq = qobj.lastdq
  let handles = qobj.handles ? qobj.handles.slice(1) : []
  count -= 1
  requests += 1
  lastdq = Date.now()
  queue.set(obj.url.host, {count, lastdq, handles})
  emitter.emit("dequeue", obj)
}

const cancel = (obj) => {
  let url = new URL(obj.url.href)
  const allhandles = []
  let qobj = queue.get(url.host)
  if (qobj) {
    allhandles.push(...(qobj.handles ? qobj.handles.slice() : []))
  }
  qobj = queue.get(`www.${url.host}`)
  if (qobj) {
    allhandles.push(...(qobj.handles ? qobj.handles.slice() : []))
  }
  allhandles.forEach((h) => {
    clearTimeout(h)
  })
}

module.exports = {
  enqueue,
  on,
  respond,
  cancel
}