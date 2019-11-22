'use strict'

const fs = require("fs")
const cachepath = require("./cachepath")
const cachestream = require("./cachestream")

const readStream = (cachePath, url, callback) => {
  if (!cachePath) return null
    // console.log("Open getstream")
  let filepath = cachepath.getReadablePath(url, cachePath)
  fs.realpath(filepath, (err, resolvedPath) => {
    if (err) callback(null, err)
    else callback(fs.createReadStream(resolvedPath))
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