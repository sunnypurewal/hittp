'use strict'

const hittp = require("./hittp")

module.exports = {
  stream: hittp.stream,
  str2url: require("./urlparse").parse,
  setCachePath: hittp.setCachePath
}