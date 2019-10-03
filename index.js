'use strict'

const hittp = require("./hittp")

module.exports = {
  stream: hittp.stream,
  get: hittp.get,
  str2url: require("./urlparse").parse,
  configure: hittp.configure
}