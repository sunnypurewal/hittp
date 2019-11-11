'use strict'

const hittp = require("./hittp")

module.exports = {
  stream: hittp.stream,
  get: hittp.get,
  head: hittp.head,
  cancel: hittp.cancel,
  on: hittp.on,
  str2url: require("./urlparse"),
  setLogLevel: hittp.setLogLevel
}