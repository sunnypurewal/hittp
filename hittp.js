'use strict'

const http = require("http")
const https = require("https")
const cache = require("./cache/cache")
const urlparse = require("./urlparse")
const queue = require("./queue")
const errors = require("./errors")

const HTTPError = errors.HTTPError
const TIMEOUT_MS = 3000

cache.setPath("./.cache")

queue.on("dequeue", (obj) => {
  getstream(obj.url, {resolve:obj.resolve,reject:obj.reject})
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

const stream = async (url) => {
  return new Promise((resolve, reject) => {
    if (typeof(url) === "string") url = urlparse.parse(url)
    cache.getstream(url).then((cached) => {
      if (cached) {
        resolve(cached)
      } else {
        queue.enqueue({url, resolve, reject})
      }
    })
  })
}

const getstream = async (url, promise=null, redirCount=0) => {
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
    const options = {host:url.host, path:url.pathname,timeout:TIMEOUT_MS}
    if (url.search.length > 0) {
      options.path = `${options.path}${url.search}`
    }
    const req = h.request(options, (res) => {
      // console.log(res.statusCode, url.href)
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
        const cachestream = new cache.CacheStream(url)
        resolve(res.pipe(cachestream))
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

module.exports = {
  stream,
  get,
  setCachePath: cache.setPath
}