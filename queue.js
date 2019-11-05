'use strict'
const events = require("events")
const emitter = new events.EventEmitter()
const queue = new Map()
let requests = 0
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
  if (obj.delay_ms === 0) {
    dequeue(obj)
    return
  }
  const url = obj.url
  const qobj = queue.get(url.host) || {}
  let count = qobj.count || 0
  const lastdq = qobj.lastdq || 0
  let handles = qobj.handles || []
  // console.log(`${handles.length} handles for ${url.host || url}`)

  let handle = null
  if (lastdq > 0 && count === 0) {
    // console.log("Enqueuing", url.host, "for", obj.options.delay_ms - (Date.now() - lastdq), "ms")
    handle = setTimeout(() => {
      dequeue(obj)
    }, obj.options.delay_ms - (Date.now() - lastdq))
  } else {
    // console.log("Enqueuing", url.host, "for", (count * obj.options.delay_ms), "ms")
    handle = setTimeout(() => {
      dequeue(obj)
    }, obj.options.delay_ms * (count))
  }
  handles.push(handle)
  
  count += 1
  queue.set(url.host, {count, lastdq, handles})
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