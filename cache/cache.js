'use strict'

const fs = require("fs")
const cachepath = require("./cachepath")
const cachestream = require("./cachestream")

const readStream = (cachePath, url, callback) => {
  if (!cachePath) return null
    // console.log("Open getstream")
  const filepath = cachepath.getReadablePath(url, cachePath)
  const stream = fs.createReadStream(filepath)
  stream.on("ready", () => {
    callback(stream)
  })
  stream.on("error", (err) => {
    callback(null, err)
  })
}

const writeStream = (cachePath, url, referrers=[]) => {
  if (!cachePath) return null
  else return new cachestream.CacheStream(url, cachePath, referrers)
}

module.exports = {
  readStream,
  writeStream
}