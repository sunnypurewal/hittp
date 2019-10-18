'use strict'
const stream = require("stream")
const fs = require("fs")
const cachepath = require("./cachepath")

class CacheStream extends stream.Transform {
  constructor(url, cachePath, referrers, options) {
    super(options)
    this.cachePath = cachePath
    this.url = url
    this.filepath = null
    this.referrers = referrers
    this.writeStream = null
  }

  getWriteStream() {
    return new Promise((resolve, reject) => {
      if (this.writeStream) resolve(this.writeStream)
      else {
        cachepath.getWritablePath(this.url, this.cachePath, this.referrers).then((filepath) => {
          this.writeStream = fs.createWriteStream(filepath)
          resolve(this.writeStream)
        })
      }
    })
  }

  _transform(chunk, enc, cb) {
    this.getWriteStream().then((writeStream) => {
      writeStream.write(chunk, enc)
      this.push(chunk)
      cb()
    })
  }
}

module.exports = {
  CacheStream
}