

const get = (url) => {
  const redirect = this[url.origin]
  if (redirect === undefined) {
    return url
  } else {
    console.log("Already know the redirect", url.origin, redirect.origin)
    let newURL = url
    newURL.origin = redirect.origin
    return newURL
  }
}

const set = (url, referrers) => {
  for (const ref of referrers) {
    if (this[ref.origin] === undefined) {
      console.log("Setting a referrer", ref.origin, url.origin)
      this[ref.origin] = url.origin
    }
  }
}

module.exports = {
  get,
  set
}