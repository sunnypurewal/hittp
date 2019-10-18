'use strict'
const stream = require("stream")
const fs = require("fs")
const fspromises = fs.promises
const cachepath = require("./cachepath")
const Future = require('future')

class CacheStream extends stream.Duplex {
  constructor(url, cachePath, referrers, options) {
    super(options)
    this.cachePath = cachePath
    this.url = url
    this.fd = null
    this.filepath = null
    this.readOffset = 0
    this.future = null
    this.referrers = referrers
    this.buffer = null
  }

  getFileDescriptor() {
    if (!this.future) this.future = Future.create(this)
    else return this.future
    
    cachepath.getWritablePath(this.url, this.cachePath, this.referrers).then((filepath) => {
      this.filepath = filepath
      fs.open(filepath, "w+", (err, fd) => {
        if (err) {
          console.error("FUTURE", err)
        } else {
          this.fd = fd
          this.future.deliver(null, fd)
        }
      })
    })
    return this.future
  }

  _read(size) {
    this.getFileDescriptor().whenever((err, fd) => {
      fs.stat(this.filepath, (err, stats) => {
        size = Math.max(0, stats.size - this.readOffset)
        if (!this.buffer || this.buffer.length < size) {
          this.buffer = Buffer.allocUnsafe(size)
        }
        // const buffer = Buffer.allocUnsafe(size)
        if (!this.fd) return
        fs.read(this.fd, this.buffer, 0, size, this.readOffset, (err, bytesRead, buf) => {
          if (bytesRead) {
            this.push(this.buffer.slice(this.readOffset, this.readOffset+size))
            this.readOffset += bytesRead
          }
        })
      })
    })
  }

  _write(chunk, encoding, callback) {
    this.getFileDescriptor().whenever((err, fd) => {
      fs.appendFile(this.fd, chunk, {encoding}, (err) => {
        callback(err)
      })
    })
  }
  
  _final(callback) {
    this.getFileDescriptor().whenever((err, fd) => {
      fs.stat(this.filepath, (err, stats) => {
        const size = Math.max(0, stats.size - this.readOffset)
        if (!this.buffer || this.buffer.length < size) {
          this.buffer = Buffer.allocUnsafe(size)
        }
        // const buffer = Buffer.allocUnsafe(size)
        fs.read(this.fd, this.buffer, 0, size, this.readOffset, (err, bytesRead, buf) => {
          if (bytesRead) {
            this.push(this.buffer.slice(this.readOffset, this.readOffset+size))
            this.readOffset += bytesRead
          }
          fs.close(this.fd, (err) => {
            this.fd = null
            this.push(null)
            callback(err)
          })
        })
      })
    })
  }
}

module.exports = {
  CacheStream
}