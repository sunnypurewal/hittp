# hittp

hittp is an HTTP library specifically designed for crawling the web. It has built-in caching so that you don't hit the same webpage multiple times. It also has per-domain queueing which means multiple requests to the same host are delayed so that the server is not overloaded by your crawler.

`npm i hittp`

## Simple GET
When you just want to fetch an entire page into memory.
```
const hittp = require("hittp")

hittp.get("newyorktimes.com").then((html) => {
  // Do something with the html
})
/* OR */
async getNYTimes = () => {
  const g = await hittp.get("newyorktimes.com")
  // Do something with the html
}
```

## Streaming GET
When you want to fetch a page and save it to file. 
```
const fs = require("fs") //filesystem
const hittp = require("hittp")

hittp.stream("newyorker.com/sitemap.xml").then((httpstream) => {
  const f = fs.createWriteStream("./sitemap.xml")
  httpstream.pipe(f)
})
/* OR */
async getSitemap = () => {
  const httpstream =  await hittp.stream("newyorker.com/sitemap.xml")
  const file = fs.createWriteStream("./sitemap.xml")
  httpstream.pipe(file)
}
```

## Web Crawling
hittp is especially useful when making many requests to one host. Requests will be queued and the same host will not be hit more than once every 3 seconds. This ensures that the website you are crawling is not overloaded with requests. It also means that a list of URLs for a single host will take `3*urls.length` seconds to iterate.
```
const hittp = require("hittp")
const urls = /* Some long list of URLs */
for (let url of urls) {
  if (typeof(url) === "string") url = hittp.str2url(url)
  hittp.stream(url).then((httpstream) => {
    const file = fs.createWriteStream(`./${url.pathname}.html`)
    httpstream.pipe(file)
  })
}
```

## str2url
When you want to convert a string into a URL object with protocol, host, path automatically added.
```
const hittp = require("hittp")

const url = hittp.str2url("vox.com")
console.log(url.href)
// 'https://vox.com'
```

## Configuration
Default configuration can be overridden by calling `configure` with an `options` argument. Setting cachePath to `null` will disable caching.
```
const hittp = require("hittp")
// Defaults:
hittp.configure({
  delay_ms: 3000,
  maxConnections: 16,
  cachePath: "./.cache"
})
```

`stream` and `get` can also take an `options` argument.
```
const hittp = require("hittp")
// Defaults:
const options = {
  timeout_ms: 3000
}
hittp.get("qz.com", options).then((html) => {
  // Do something with the html
})
```

### Don't forget to add your cache path to .gitignore! Default path is `./.cache`