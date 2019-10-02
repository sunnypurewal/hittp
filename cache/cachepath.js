'use strict'

const path = require("path")
const fs = require("fs").promises
const crypto = require('crypto')
const str2url = require("../urlparse").str2url

const fsoptions = {recursive: true}

let CACHE_PATH = "./.cache"

const setPath = async (path, deleteExisting=true) => {
  try {
    if (deleteExisting) {
      await fs.rmdir(CACHE_PATH)
    }
    CACHE_PATH = path
    await fs.mkdir(CACHE_PATH, fsoptions)
  } catch (error) {
    throw error
  }
}

const getWritablePath = async (url) => {
  const dir = getCacheDirname(url)
  try {
    await fs.mkdir(dir, fsoptions)
    return path.join(dir, getCacheFilename(url))
  } catch (error) {
    console.error(error)
    return null
  }
}

const getReadablePath = (url) => {
  return path.join(getCacheDirname(url), getCacheFilename(url))
}

const getCacheDirname = (url) => {
  if (typeof(url) === "string") url = new URL(url)
  return path.join(CACHE_PATH, url.origin)
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
  getReadablePath,
  CACHE_PATH,
  setPath
}