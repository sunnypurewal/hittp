const { accessSync, appendFileSync, mkdirSync, writeFileSync } = require("fs")
const hittp = require("./hittp")
const str2url = require("./urlparse")
const { JSDOM } = require("jsdom")
const { join } = require("path")

module.exports = async function(callback) {
  const ORIGIN = "https://en.wikipedia.org"
  const START_URL = `${ORIGIN}/wiki/Category:News_websites_by_country`
  const path = join(".", ".turbocrawl", "default", "countries")
  try {
    accessSync(path)
  } catch (err) {
    mkdirSync(path, {recursive: true})
  }
  const options = { delay_ms: 300 }//, cachePath: "./.cache" }
  let html = await hittp.get(str2url(START_URL), options)
  const dom = new JSDOM(html, {url: START_URL})
  const document = dom.window.document
  const countries = document.querySelectorAll("div.mw-category > div.mw-category-group > ul > li")
  const names = []
  for (const country of countries) {
    let name = country.querySelectorAll("a")
    name = name[0].textContent
    name = name.slice(0, name.indexOf("news websites")).trim()
    names.push(name)
  }
  try {
    writeFileSync("./.turbocrawl/default/countries.json", JSON.stringify(names))
  // tslint:disable-next-line: no-empty
  } catch {}
    // let dirname = "./.turbocrawl/default/countries"
    // let filenames = readdirSync(dirname)
    // for (let filename of filenames) {
    //   unlinkSync(join(dirname, filename))
    // }
  for (const country of countries) {
    let countryname = country.querySelectorAll("a")
    countryname = countryname[0].textContent
    countryname = countryname.slice(0, countryname.indexOf("news websites")).trim()
    const path = `./.turbocrawl/default/countries/${countryname}`
    try {
      accessSync(path)
      // console.log("Skipping", countryname)
      // continue
    // tslint:disable-next-line: no-empty
    } catch (err) {}
    const link = country.querySelectorAll("a")
    const href = link[0].getAttribute("href")
    // console.log(`${ORIGIN}${href}`)
    try {
      html = await hittp.get(str2url(`${ORIGIN}${href}`), options)
    } catch {
      continue
    }
    const dom = new JSDOM(html, {url: `${ORIGIN}${href}`})
    const document = dom.window.document
    const newsWebsites = document.querySelectorAll("div.mw-content-ltr * ul > li")
    // console.log(newsWebsites.length, countryname, "websites")
    for (const website of newsWebsites) {
      const link = website.querySelectorAll("a")
      if (!link[0]) { continue }
      let href = link[0].getAttribute("href") || ""
      const hrefsplit = href.split("/")
      // console.log(hrefsplit)
      if (!hrefsplit[1] || hrefsplit[1] !== "wiki") { continue }
      if (!hrefsplit[2]) { continue }
      if (hrefsplit[2].indexOf(":") !== -1) { continue }
      href = `${ORIGIN}${href}`
      // console.log(`\t ${href}`)
      try {
        html = await hittp.get(str2url(href), options)
      } catch {
        continue
      }
      const dom = new JSDOM(html, {url: href})
      const document = dom.window.document
      const websites = document.querySelectorAll("table.infobox>tbody>tr")
      for (const candidate of websites) {
        if (!candidate) { continue }
        let scope = candidate.querySelector("th")
        scope = scope ? scope.textContent.trim().toLowerCase() : ""
        if (scope === "website") {
          let href = candidate.querySelector("a")
          if (!href) { continue }
          href = href.getAttribute("href")
          if (!href || href.length === 0) { continue }
          // console.log(`\t\t${href}`)
          try {
            if (href) { appendFileSync(path, href + "\n") }
          } catch {
            continue
          }
        }
      }
    }
  }
  if (callback) { callback(5000) }
}
