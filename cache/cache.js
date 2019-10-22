'use strict'

const fs = require("fs")
const fspromises = fs.promises
const cachepath = require("./cachepath")
const cachestream = require("./cachestream")

let CACHE_PATH = "./.cache"

const readStream = (url) => {
  return new Promise((resolve, reject) => {
    if (!CACHE_PATH) resolve(null)
    // console.log("Open getstream")
    const filepath = cachepath.getReadablePath(url, CACHE_PATH)
    const stream = fs.createReadStream(filepath)
    stream.on("ready", () => {
      resolve(stream)
    })
    stream.on("error", (err) => {
      reject(err)
    })
  })
}

const writeStream = (url, referrers=[]) => {
  if (!CACHE_PATH) return null
  else return new cachestream.CacheStream(url, CACHE_PATH, referrers)
}

const setPath = async (path) => {
  try {
    CACHE_PATH = path
    if (CACHE_PATH) {
      await fspromises.mkdir(CACHE_PATH, {recursive: true})
    }
  } catch (error) {
    throw error
  }
}

module.exports = {
  readStream,
  writeStream,
  setPath
}