// const wikipedia = require("./wikipedia")
// wikipedia()

const fs = require("fs")
const hittp = require("./index")

function domainsFromFile(path) {
  let domains = fs.readFileSync(path)
  domains = domains.toString().split("\n").map((line) => {
    return line.split("||")[0]
  })
  domains = domains.filter((d) => d.length > 0)
  domains = domains.map((d) => hittp.str2url(d))
  return domains
}

// let domains = domainsFromFile("./urlset")
// const random = Math.floor(Math.random() * domains.length)
// const domain = new URL(domains[random].href)
// hittp.setLogLevel("debug")
let domain = "cnn.com"
// for (const domain of domains) {
  let o1 = { delay_ms: 3000, asJSON: false }
  hittp.get(domain, o1).then((html) => {
    console.log(o1)
    console.log(typeof(html))
  })
  console.log('in between')
  let o2 = { delay_ms: 3000, asJSON: true }
  hittp.get(domain, o2).then((html) => {
    console.log(o2)
    console.log(typeof(html))
  })
// }