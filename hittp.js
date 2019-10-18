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
const headers = require("./headers")

const HTTPError = errors.HTTPError

const defaultOptions = {
  timeout_ms: 3000
}

queue.on("dequeue", (obj) => {
  getstream(obj.url, {resolve:obj.resolve,reject:obj.reject}, obj.options)
})

const get = (url, options=defaultOptions) => {
  return new Promise((resolve, reject) => {
    stream(url, options).then((httpstream) => {
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
    if (!url) reject(new HTTPError("Bad Request", 400))
    if (typeof(url) === "string") url = urlparse.parse(url)
    cache.readStream(url).then((cached) => {
      console.log(304, url.href)
      resolve(cached)
    }).catch((_) => {
      //URL was not found in cache
      queue.enqueue({url, resolve, reject, options})
    })
  })
}

const getstream = (url, promise, options, referrers=[]) => {
  const resolve = promise.resolve 
  const reject = promise.reject
  if (referrers.length > 10) {
    console.log(429, url.href)
    reject(new HTTPError(`Too many redirects`, 429))
    return
  }
  const h = url.protocol.indexOf("https") != -1 ? https : http
  options.host = url.host
  options.path = url.pathname
  options.timeout = options.timeout_ms
  if (url.search.length > 0) {
    options.path = `${options.path}${url.search}`
  }
  const req = h.request(options, (res) => {
    console.log(res.statusCode, url.href)
    const encoding = headers.getEncoding(res.headers)
    res.setEncoding(encoding)
    if (res.statusCode >= 300 && res.statusCode <= 399) {
      const location = res.headers.location
      if (location) {
        const newurl = urlparse.parse(location)
        if (newurl) {
          referrers.push(url)
          getstream(newurl, {resolve, reject}, options, referrers)
          return
          // console.log("Redirecting to ", newurl.href)
        }
      }
    }
    if (res.statusCode >= 200 && res.statusCode <= 299) {
      const cachestream = cache.writeStream(url, encoding, referrers)
      if (cachestream) {
        resolve(res.pipe(cachestream))
      } else {
        resolve(res)
      }
      queue.respond(url)
    } else {
      reject(new HTTPError(res.statusMessage, res.statusCode))
      queue.respond(url)
    }
  })
  req.on("timeout", () => {
    req.abort()
    reject(new HTTPError("Timeout", 408))
    queue.respond(url)
  })
  req.on("error", (err) => {
    reject(err)
    queue.respond(url)
  })
  req.end()
}

const configure = (options) => {
  queue.configure(options)
  cache.setPath(options.cachePath)
}

module.exports = {
  stream,
  get,
  configure
}