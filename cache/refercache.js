

const get = (url) => {
  const redirect = this[url.origin]
  if (redirect === undefined) {
    return url
  } else {
    // console.log("Already know the redirect", url.origin, redirect)
    let newURL = new URL(`${redirect}${url.pathname}`)
    return newURL
  }
}

const set = (url, referrers) => {
  for (const ref of referrers) {
    if (ref.origin != url.origin && this[ref.origin] === undefined) {
      // console.log("Setting a referrer", ref.origin, url.origin)
      this[ref.origin] = url.origin
    }
  }
}

module.exports = {
  get,
  set
}