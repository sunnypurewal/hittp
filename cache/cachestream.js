'use strict'
const stream = require("stream")
const fs = require("fs")
const fspromises = fs.promises
const cachepath = require("./cachepath")
const Future = require('future')

class CacheStream extends stream.Duplex {
  constructor(url, options) {
    super(options)
    this.url = url
    this.filehandle = null
    this.fd = null
    this.filepath = null
    this.readOffset = 0
    this.creating = false
    this.queue = []
    this.future = null
  }

  getFileDescriptor = () => {
    if (!this.future) this.future = Future.create(this)
    else return this.future
    
    cachepath.getWritablePath(this.url).then((filepath) => {
      this.filepath = filepath
      fs.open(filepath, "w+", (err, fd) => {
        this.fd = fd
        this.future.deliver(null, fd)
      })
    })
    return this.future
  }

  getFilehandle = () => {
    if (!this.future) this.future = Future.create(this)
    else return this.future
    cachepath.getWritablePath(this.url).then((filepath) => {
      this.filepath = filepath
      fspromises.open(filepath, "w+").then((handle) => {
        this.filehandle = handle
        this.future.deliver(null, handle)
      })
    })
    return this.future
  }

  _read = (size) => {
    this.getFileDescriptor().whenever((err, fd) => {
      fs.stat(this.filepath, (err, stats) => {
        size = Math.max(0, stats.size - this.readOffset)
        const buffer = Buffer.allocUnsafe(size)
        if (!this.fd) return
        fs.read(this.fd, buffer, 0, size, this.readOffset, (err, bytesRead, buf) => {
          if (bytesRead) {
            let keepgoing = this.push(buffer)
            this.readOffset += bytesRead
          }
        })
      })
    })
  }
  _write = (chunk, encoding, callback) => {
    this.getFileDescriptor().whenever((err, fd) => {
      fs.stat(this.filepath, (err, stats) => {
        const size = Math.max(0, stats.size - this.readOffset)
        const buffer = Buffer.allocUnsafe(size)
        fs.appendFile(this.fd, chunk, {encoding}, (err) => {
          callback(err)
        })
      })
    })
  }
  
  _final = (callback) => {
    this.getFileDescriptor().whenever((err, fd) => {
      fs.stat(this.filepath, (err, stats) => {
        const size = Math.max(0, stats.size - this.readOffset)
        const buffer = Buffer.allocUnsafe(size)
        fs.read(this.fd, buffer, 0, size, this.readOffset, (err, bytesRead, buf) => {
          if (bytesRead) {
            let keepgoing = this.push(buffer)
            this.readOffset += bytesRead
          }
          fs.close(this.fd, (err) => {
            this.fd = null
            callback(err)
          })
        })
      })
    })
  }

  _destroy = (err, callback) => {
    if (err) console.error("Destroying cachestream due to error", err)
    else {
      callback()
    }
  }
}

module.exports = {
  CacheStream
}