'use strict'

const path = require("path")
const fs = require("fs").promises
const crypto = require('crypto')

const getWritablePath = async (url, cachePath) => {
  const dir = getCacheDirname(url, cachePath)
  try {
    await fs.mkdir(dir, {recursive: true})
    return path.join(dir, getCacheFilename(url))
  } catch (error) {
    console.error(error)
    return null
  }
}

const getReadablePath = (url, cachePath) => {
  return path.join(getCacheDirname(url, cachePath), getCacheFilename(url))
}

const getCacheDirname = (url, cachePath) => {
  if (typeof(url) === "string") url = new URL(url)
  return path.join(cachePath, url.host)
}

const getCacheFilename = (url) => {
  if (typeof(url) === "string") url = new URL(url)
  const hash = crypto.createHash("sha256")
  hash.update(url.pathname)
  if (url.search.length > 0) {
    hash.update(url.search)
  }
  return hash.digest("hex")
}

module.exports = {
  getWritablePath,
  getReadablePath
}