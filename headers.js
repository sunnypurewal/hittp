'use strict'

const getEncoding = (headers) => {
  let encoding = "utf-8"
  const contentType = headers["content-type"]
  if (contentType) {
    const options = contentType.split(";")
    for (const option of options) {
      if (option.includes("charset")) {
        const charset = option.split("=")[1]
        if (charset) encoding = charset.toLowerCase()
        // console.log("Got charset from headers", encoding)
        break
      }
    }
  }
  if (encoding === "iso-8859-1") encoding = "latin1"
  return encoding
}

module.exports = {
  getEncoding
}