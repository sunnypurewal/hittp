'use strict'
const events = require("events")
const emitter = new events.EventEmitter()
const queue = new Map()
let requests = 0
const DOMAIN_DELAY_S = 3
const DOMAIN_DELAY_MS = DOMAIN_DELAY_S * 1000
const MAX_CONNECTIONS = 5

// setInterval(() => {
//   let c = 0
//   queue.forEach((value, key, map) => {
//     c += value.count
//   })
//   console.log(`Queue has ${c} values for ${queue.size} hosts`)
//   console.log("Requests count", requests)
// }, 3000)

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
  const qobj = queue.get(url.host) || {}
  let count = qobj.count || 0
  const lastdq = qobj.lastdq || 0

  if (lastdq > 0 && count === 0) {
    // console.log("Enqueuing", url.host, "for", DOMAIN_DELAY_MS - (Date.now() - lastdq), "ms")
    setTimeout(() => {
      dequeue(obj)
    }, DOMAIN_DELAY_MS - (Date.now() - lastdq))
  } else {
    // console.log("Enqueuing", url.host, "for", (count * DOMAIN_DELAY_MS), "ms")
    setTimeout(() => {
      dequeue(obj)
    }, DOMAIN_DELAY_MS * count)
  }
  
  count += 1
  queue.set(url.host, {count, lastdq})
  emitter.emit("enqueued", obj)
  let c = 0
  queue.forEach((value, key, map) => {
    c += value.count
  })
  // console.log("Queue has values: ", c)
  // console.log("queue has", queue.size, "hosts")
}

const dequeue = (obj) => {
  if (emitter.listenerCount("dequeue") === 0) {
    enqueue(obj)
    return
  }
  if (requests > MAX_CONNECTIONS) {
    enqueue(obj)
    return
  }
  const qobj = queue.get(obj.url.host)
  let count = qobj.count
  let lastdq = qobj.lastdq
  count -= 1
  requests += 1
  lastdq = Date.now()
  queue.set(obj.url.host, {count, lastdq})
  emitter.emit("dequeue", obj)
}

module.exports = {
  enqueue,
  on,
  respond
}