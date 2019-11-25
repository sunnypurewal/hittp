'use strict'

const dnscache = require("dnscache")({
  "enable": true,
  "ttl": 300,
  "cachesize": 1000
})
const http = require("http")
const https = require("https")
const cache = require("./cache/cache")
const urlparse = require("./urlparse")
const queue = require("./queue")
const errors = require("./errors")
const refercache = require('./cache/refercache')

const HTTPError = errors.HTTPError

const defaultOptions = {
  timeout_ms: 10000,
  decoded: true,
  delay_ms: 0,
  cachePath: "./.hittp/cache"
}
let info = () => {}
let debug = () => {}
let error = () => {}

const setLogLevel = (level) => {
  if (level === "info") {
    info = console.log
    debug = console.log
    error = console.error
  } else if (level === "debug") {
    info = () => {}
    debug = console.log
    error = console.error
  } else if (level === "error") {
    info = () => {}
    debug = () => {}
    error = console.error
  } else {
    info = () => {}
    debug = () => {}
    error = () => {}
  }
}

queue.on("dequeue", (obj) => {
  getstream(obj.url, {resolve:obj.resolve,reject:obj.reject}, obj.options)
})

const on = (event, callback) => {
  queue.on(event, callback)
}

const head = (url, uoptions) => {
  const options = Object.assign(defaultOptions, uoptions)
  return new Promise((resolve, reject) => {
    if (typeof(url) === "string") url = urlparse(url)
    const h = url.protocol.indexOf("https") != -1 ? https : http
    options.host = url.host
    options.path = url.pathname
    options.timeout = options.timeout_ms
    options.method = "HEAD"
    if (url.search.length > 0) {
      options.path = `${options.path}${url.search}`
    }
    const req = h.request(options, (res) => {
      resolve(res.headers)
    })
    req.end()
  })
}

const get = (url, uoptions) => {
  const options = Object.assign(defaultOptions, uoptions)
  return new Promise((resolve, reject) => {
    stream(url, options).then((httpstream) => {
      let url = null
      if (options.asJSON) {
        url = httpstream.url
        httpstream = httpstream.stream
      }
      const chunks = []
      let size = 0
      httpstream.on("data", (chunk) => {
        if ((options || defaultOptions).buffer) {
          options.buffer.fill(chunk, size, chunk.length+size)
          size += chunk.length
        } else {
          chunks.push(chunk)
        }
      })
      httpstream.on("close", () => {
        resolve(null)
      })
      httpstream.on("end", () => {
        if ((options || defaultOptions).buffer) {
          resolve(size)
        } else if ((options || defaultOptions).decoded) {
          if ((options || defaultOptions).asJSON) {
            resolve({html: chunks.join(""), url})
          } else {
            resolve(chunks.join(""))
          }
        } else {
          if ((options || defaultOptions).asJSON) {
            resolve({html: Buffer.concat(chunks), url})
          } else {
            resolve(Buffer.concat(chunks))
          }
        }
      })
    }).catch((err) => {
      reject(err)
    })
  })
}

const stream = (url, uoptions) => {
  const options = Object.assign(defaultOptions, uoptions)
  return new Promise((resolve, reject) => {
    if (typeof(url) === "string") url = urlparse(url)
    if (!url) reject(new HTTPError("Invalid URL", 400))
    if (options.cachePath) {
      cache.readStream(options.cachePath, url, (cached, err) => {
        if (err) queue.enqueue({url, resolve, reject, options})
        else {
          debug(304, url.href)
          if (options.asJSON) {
            resolve({stream:cached, url})
          } else {
            resolve(cached)
          }
        }
      })
    } else queue.enqueue({url, resolve, reject, options})
  })
}

const getstream = (purl, promise, options, referrers=[]) => {
  const resolve = promise.resolve
  const reject = promise.reject
  if (referrers.length > 10) {
    info(429, url.href)
    reject(new HTTPError(`Too many redirects`, 429))
    return
  }
  let url = refercache.get(purl)
  const h = url.protocol.indexOf("https") != -1 ? https : http
  options.host = url.host
  options.path = url.pathname
  options.timeout = options.timeout_ms
  if (url.search.length > 0) {
    options.path = `${options.path}${url.search}`
  }
  const req = h.request(options, (res) => {
    debug(res.statusCode, url.href)
    if (res.statusCode >= 300 && res.statusCode <= 399) {
      const location = res.headers.location
      if (location) {
        const newurl = urlparse(location) || urlparse(`${options.host}${location}`)
        if (newurl) {
          referrers.push(url)
          info(res.statusCode, url.href, "->", newurl.href)
          getstream(newurl, {resolve, reject}, options, referrers)
          return
          // console.log("Redirecting to ", newurl.href)
        }
      }
    }
    queue.respond(url, referrers)
    if (res.statusCode >= 200 && res.statusCode <= 299) {
      const cachestream = cache.writeStream(options.cachePath, url, referrers)
      let stream = null
      if (cachestream) {
        stream = res.pipe(cachestream)
      } else {
        stream = res
      }
      if (options.asJSON) {
        resolve({stream, url})
      } else {
        resolve(stream)
      }
      res.on("error", (err) => {
        error("HTTP response stream error", err.message)
        cachestream.end()
      })
    } else {
      reject(new HTTPError(res.statusMessage, res.statusCode))
    }
  })
  req.on("timeout", () => {
    queue.respond(url, referrers)
    req.abort()
    let err = new HTTPError("Timeout", 408)
    info(408, url.href)
    reject(err)
  })
  req.on("error", (err) => {
    error(err, url.href)
    queue.respond(url, referrers)
    reject(err)
  })
  req.end()
}

const cancel = (url) => {
  queue.cancel({url})
}

module.exports = {
  cancel,
  get,
  head,
  on,
  setLogLevel,
  stream,
}