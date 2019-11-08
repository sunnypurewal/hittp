const { accessSync, appendFileSync, mkdirSync, writeFileSync } = require("fs")
const hittp = require("./hittp")
const str2url = require("./urlparse")
const { JSDOM } = require("jsdom")
const { join } = require("path")

module.exports = function(callback) {
  const ORIGIN = "https://en.wikipedia.org"
  const START_URL = `${ORIGIN}/wiki/Category:News_websites_by_country`
  const path = join(".", ".turbocrawl", "default", "countries")
  const hittpoptions = { delay_ms: 3000 }
  try {
    accessSync(path)
  } catch (err) {
    mkdirSync(path, {recursive: true})
  }
  hittp.get(str2url(START_URL), hittpoptions).then((html) => {
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
    writeFileSync("./.turbocrawl/default/countries.json", JSON.stringify(names))
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
        console.log("Skipping", countryname)
        continue
      // tslint:disable-next-line: no-empty
      } catch (err) {
      }
      const link = country.querySelectorAll("a")
      const href = link[0].getAttribute("href")
      // console.log(`${ORIGIN}${href}`)
      hittp.get(str2url(`${ORIGIN}${href}`), hittpoptions).then((html) => {
        const dom = new JSDOM(html, {url: `${ORIGIN}${href}`})
        const document = dom.window.document
        const newsWebsites = document.querySelectorAll("div.mw-content-ltr * ul > li")
        console.log(newsWebsites.length, countryname, "websites")
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
          hittp.get(str2url(href), hittpoptions).then((html) => {
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
                if (href) { appendFileSync(path, href + "\n") }
              }
            }
          })
        }
      })
    }
  }).catch((err) => {
    console.error("Oops", err.message)
  })
}
