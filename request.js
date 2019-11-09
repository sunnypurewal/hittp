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

let domains = domainsFromFile("./urlset")
// const random = Math.floor(Math.random() * domains.length)
// const domain = new URL(domains[random].href)
hittp.setLogLevel("debug")
for (const domain of domains) {
  hittp.get(domain, { delay_ms: 3000 }).then((html) => {
    // console.log(html.length)
  })
}