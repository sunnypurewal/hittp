'use strict'

const http = require("http")
const https = require("https")
const cache = require("./cache/cache")
const urlparse = require("./urlparse")
const queue = require("./queue")
const errors = require("./errors")

const HTTPError = errors.HTTPError

const defaultOptions = {
  timeout: 3000
}

queue.on("dequeue", (obj) => {
  getstream(obj.url, {resolve:obj.resolve,reject:obj.reject}, obj.options)
})

const get = (url) => {
  return new Promise((resolve, reject) => {
    stream(url).then((httpstream) => {
      const chunks = []
      httpstream.on("data", (chunk) => {
        chunks.push(chunk)
      })
      httpstream.on("end", () => {
        resolve(chunks.join(""))
      })
    }).catch((err) => {
      reject(err)
    })
  })
}

const stream = (url, options=defaultOptions) => {
  return new Promise((resolve, reject) => {
    if (typeof(url) === "string") url = urlparse.parse(url)
    cache.readStream(url).then((cached) => {
      if (cached) {
        console.log("http.cached", url.href)
        resolve(cached)
      } else {
        queue.enqueue({url, resolve, reject, options})
      }
    })
  })
}

const getstream = (url, promise=null, options, redirCount=0) => {
  return new Promise((resolve, reject) => {
    if (promise) {
      resolve = promise.resolve 
      reject = promise.reject
    }
    if (redirCount > 10) {
      // console.log(429, url.href)
      reject(new HTTPError(`Too many redirects`, 429))
      return
    }
    const h = url.protocol.indexOf("https") != -1 ? https : http
    // console.log("http.stream ", url.href)
    options.host = url.host
    options.path = url.pathname
    if (url.search.length > 0) {
      options.path = `${options.path}${url.search}`
    }
    const req = h.request(options, (res) => {
      console.log(res.statusCode, url.href)
      if (res.statusCode >= 300 && res.statusCode <= 399) {
        const location = res.headers.location
        if (location) {
          // console.log("Redirecting to ", location)
          const newurl = urlparse.parse(location)
          getstream(newurl, {resolve, reject}, redirCount+1)
          return
        }
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        const cachestream = cache.writeStream(url)
        if (cachestream) {
          resolve(res.pipe(cachestream))
        } else {
          resolve(res)
        }
        queue.respond(url)
      } else {
        reject(new HTTPError(res.statusMessage))
        queue.respond(url)
      }
    })
    req.on("timeout", () => {
      req.abort()
      // console.log(408, url.href)
      reject(new HTTPError("Timeout", 408))
      queue.respond(url)
    })
    req.on("error", (err) => {
      reject(err)
      queue.respond(url)
    })
    req.end()
  })
}

const configure = (options) => {
  if (options.delay_ms) {
    queue.DOMAIN_DELAY_MS = options.delay_ms
  }
  if (options.maxConnections) {
    queue.MAX_CONNECTIONS = options.maxConnections
  }
  cache.setPath(options.cachePath)
}

module.exports = {
  stream,
  get,
  configure
}