'use strict'

const fs = require("fs")
const cachepath = require("./cachepath")
const cachestream = require("./cachestream")

const getstream = (url) => {
  return new Promise((resolve, _) => {
    if (!cachepath.CACHE_PATH) resolve(null)
    // console.log("Open getstream")
    const filepath = cachepath.getReadablePath(url)
    const stream = fs.createReadStream(filepath, {autoDestroy: true})
    stream.on("ready", () => {
      resolve(stream)
    })
    stream.on("error", (err) => {
      resolve(null)
    })
  })
}

module.exports = {
  getstream,
  setPath: cachepath.setPath,
  CacheStream: cachestream.CacheStream
}