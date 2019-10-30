'use strict'

const url = require("url")

const parse = (string) => {
  if (!string) return null
  if (typeof(string) !== "string") {
    if (string.href) {
      return string
    } else {
      return null
    }
  }
  if (!string.includes(".")) return null
  try {
    let protocol = "http"
    let protIndex = string.indexOf("://")
    if (protIndex == -1) {
      string = `http://${string}`
    } else {
      protocol = string.slice(0, protIndex)
    }
    let hostIndex = protocol.length + 3
    let pathIndex = hostIndex
    let slash = string[pathIndex]
    while (slash != "/" && pathIndex < string.length) {
      slash = string[pathIndex]
      pathIndex++
    }
    if (slash === "/") {
      pathIndex--
    }
    let host = string.slice(hostIndex, pathIndex)
    let path = string.slice(pathIndex)
    if (path[1] === "/") {
      path = path.slice(1)
    }

    const url = new URL(`${protocol}://${host}${path}`)
    return url
  } catch (err) {
    return null
  }
}

module.exports = parse