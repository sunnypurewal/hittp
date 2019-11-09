'use strict'
const events = require("events")
const emitter = new events.EventEmitter()
const queue = new Map()
const symlinks = new Map()
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

function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
 }

const qget = (origin) => {
  // console.log(origin, symlinks.has(origin))//, symlinks.get(origin), symlinks.get(origin).fn(symlinks.get(origin).origin))
  let qobj = queue.get(origin)
  if (!qobj && symlinks.has(origin)) {
    qobj = symlinks.get(origin)
    console.log("FN?", qobj)
    while (qobj.fn) {
      // console.log("LOOP", qobj)
      qobj = qobj.fn(qobj.origin)
    }
  }
  return qobj || {}
}

// const redirect = (fromurl, tourl) => {
//   if (fromurl.origin == tourl.origin) return
//   console.log("REDIRECT", fromurl.origin, tourl.origin)
//   symlinks.set(tourl.origin, {
//     fn: (origin) => {
//       if (queue.has(origin)) {
//         console.log("Queue has", origin)
//         return queue.get(origin) 
//       } else if (symlinks.has(origin)) {
//         // console.log("Symlinks has", origin)
//         return symlinks.get(origin)
//       } else {
//         console.log("No one has", origin)
//       }
//     },
//     origin: tourl.origin
//   })
// }

const respond = (url, referrers) => {
  // console.log("RESPOND", url.href)
  let reqs = requests.get(url.origin) || []
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
  let next = q.shift()
  queue.set(url.origin, {queue:q, lastdq, origin})
  if (next) {
    reqs.push(next.url)
    requests.set(next.url.origin, [next.url])
    dequeue(next)
  }
}

const enqueue = (obj) => {
  const url = obj.url
  let reqs = requests.get(url.origin) || []
  const qobj = qget(url.origin) || {}
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
    dequeue(obj)
  }
}

const dequeue = (obj) => {
  const url = obj.url
  const qobj = qget(obj.url.origin)
  let lastdq = qobj.lastdq || 0
  let now = Date.now()
  // console.log(now-lastdq, obj.options.delay_ms)
  if (now - lastdq < obj.options.delay_ms) {
    setTimeout(() => {
      emitter.emit("dequeue", obj)
    }, obj.options.delay_ms - (now - lastdq))
  } else {
    emitter.emit("dequeue", obj)
  }
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