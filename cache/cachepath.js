'use strict'

const path = require("path")
const fs = require("fs").promises
const crypto = require('crypto')
const urlparse = require("../urlparse")

const getWritablePath = async (url, cachePath, referrers) => {
  return new Promise((resolve, reject) => {
    const dir = getCacheDirname(url, cachePath)
    fs.mkdir(dir, {recursive:true}).then(() => {
      const writableFilename = getCacheFilename(url)
      const writablePath = path.join(dir, writableFilename)
      resolve(writablePath)
      buildSymLinks(writablePath, referrers, cachePath)
    })
  })
}

const buildSymLinks = (target, referrers, cachePath) => {
  let paths = new Map()
  const targetDir = path.dirname(target).split(path.sep).pop()
  const targetBase = path.basename(target)
  for (const r of referrers) {
    let dirname = getCacheDirname(r, cachePath)
    let filename = getCacheFilename(r)
    let arr = paths.get(dirname) || []
    arr.push(filename)
    paths.set(dirname, arr)
  }
  for (const [dirname, filenames] of paths) {
    if (dirname == targetDir) {
      for (const filename of filenames) {
        fs.symlink(targetBase, path.join(dirname, filename)).catch((err) => {})
      }
    } else {
      fs.mkdir(dirname, {recursive: true}).then(() => {
        for (const filename of filenames) {
          fs.symlink(path.join("../", targetDir, targetBase), path.join(dirname, filename)).catch((err) => {})
        }
      })
    }
  }
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