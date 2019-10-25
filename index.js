'use strict'

const hittp = require("./hittp")

module.exports = {
  stream: hittp.stream,
  get: hittp.get,
  head: hittp.head,
  str2url: require("./urlparse"),
  configure: hittp.configure
}