'use strict'
const events = require("events")
const emitter = new events.EventEmitter()
const queue = new Map()
const requests = new Map()
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
  } else if (event === "emptied") {
    emitter.addListener("emptied", (origin) => {
      callback(origin)
    })
  }
}

const respond = (url, referrers) => {
  // console.log("RESPOND", url.href)
  let qobj = queue.get(url.origin)
  if (!qobj) {
    for (const r of referrers) {
      qobj = queue.get(r.origin)
      if (qobj) {
        break
      }
    }
  }
  let q = qobj.queue || []
  const lastdq = qobj.lastdq || 0
  const origin = qobj.origin || url.origin
  q.shift()
  queue.set(url.origin, {queue:q, lastdq, origin})
  if (q[0]) {
    dequeue(q[0])
  } else {
    emitter.emit("emptied", origin)
  }
}

const enqueue = (obj) => {
  // console.log("ENQUEUE", obj.url.href)
  const url = obj.url
  let reqs = requests.get(url.origin) || []
  const qobj = queue.get(url.origin) || {}
  let q = qobj.queue || []
  const lastdq = qobj.lastdq || 0
  for (const o of q) {
    if (obj.url.href == o.url.href) {
      return
    }
  }
  q.push(obj)
  queue.set(url.origin, {queue:q, lastdq, origin: url.origin})
  if (q.length === 1 || obj.options.delay_ms === 0) {
    process.nextTick( () => { dequeue(obj) })
  }
}

const dequeue = (obj) => {
  // console.log("DEQUEUE", obj.url.href)
  const url = obj.url
  let reqs = requests.get(url.origin) || []
  const qobj = queue.get(obj.url.origin)
  let lastdq = qobj.lastdq || 0
  let now = Date.now()
  let timediff = now - lastdq
  let delay_ms = obj.options.delay_ms
  // console.log(timediff, delay_ms-timediff)
  if (timediff < delay_ms) {
    now += delay_ms - timediff
    setTimeout(() => {
      emitter.emit("dequeue", obj)
    }, delay_ms - timediff)
  } else {
    emitter.emit("dequeue", obj)
  }
  reqs.push(url)
  requests.set(url.origin, reqs)
  queue.set(url.origin, Object.assign(qobj, {lastdq: now}))
}

const cancel = (obj) => {
  let url = new URL(obj.url.href)
  queue.set(url.origin, [])
}

module.exports = {
  enqueue,
  on,
  respond,
  cancel
}