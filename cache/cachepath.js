'use strict'

const path = require("path")
const fs = require("fs").promises
const crypto = require('crypto')
const urlparse = require("../urlparse")

const getWritablePath = async (url, cachePath, referrers) => {
  return new Promise((resolve, reject) => {
    const dir = getCacheDirname(url, cachePath)
    fs.access(dir).then(() => {
      const writableFilename = getCacheFilename(url)
      const writablePath = path.join(dir, writableFilename)
      resolve(writablePath)
      for (const r of referrers) {
        const sympath = path.join(dir, getCacheFilename(r))
        console.log(sympath)
        fs.symlink(writableFilename, sympath).catch((err) => {})
      }
    }).catch((err) => {
      fs.mkdir(dir, {recursive: true}).then(() => {
        const writableFilename = getCacheFilename(url)
        const writablePath = path.join(dir, writableFilename)
        resolve(writablePath)
        for (const r of referrers) {
          const sympath = path.join(dir, getCacheFilename(r))
          console.log(sympath)
          fs.symlink(writableFilename, sympath).catch((err) => {})
        }
      }).catch((err) => {
        reject(err)
      })
    })
  })
}

const getReadablePath = (url, cachePath) => {
  return path.join(getCacheDirname(url, cachePath), getCacheFilename(url))
}

const getCacheDirname = (url, cachePath) => {
  if (typeof(url) === "string") url = urlparse.parse(url)
  return path.join(cachePath, url.host)
}

const getCacheFilename = (url) => {
  if (typeof(url) === "string") url = urlparse.parse(url)
  const hash = crypto.createHash("sha256")
  hash.update(url.protocol)
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