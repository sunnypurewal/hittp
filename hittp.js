'use strict'

const http = require("http")
const https = require("https")
const cache = require("./cache/cache")
const urlparse = require("./urlparse")
const queue = require("./queue")
const errors = require("./errors")

const HTTPError = errors.HTTPError

cache.setPath("./.cache")

queue.on("dequeue", (obj) => {
  getstream(obj.url, {resolve:obj.resolve,reject:obj.reject})
})

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
      reject(new HTTPError(`Too many redirects ${url.href}`))
      return
    }
    const h = url.protocol.indexOf("https") != -1 ? https : http
    // console.log("http.stream ", url.href)
    const options = {host:url.host, path:url.pathname,timeout:3000}
    if (url.search.length > 0) {
      options.path = `${options.path}${url.search}`
    }
    const req = h.request(options, (res) => {
      console.log(res.statusCode, `${options.host}${options.path}`)
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        const cachestream = new cache.CacheStream(url)
        resolve(res.pipe(cachestream))
        queue.respond(url)
      } else if (res.statusCode >= 300 && res.statusCode <= 399) {
        const location = res.headers.location
        if (location) {
          console.log("Redirecting to ", location)
          const newurl = urlparse.parse(location)
          getstream(newurl, {resolve, reject}, redirCount+1)
          return
        }
      } else {
        reject(new HTTPError(res.statusMessage))
        queue.respond(url)
      }
    })
    req.on("timeout", () => {
      req.abort()
      reject(new HTTPError("Timeout"))
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
  setCachePath: cache.setPath
}