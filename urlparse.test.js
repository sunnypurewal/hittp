const str2url = require("./urlparse")

test("independent.co.uk", () => {
  // console.log("independent.co.uk")
  const url = str2url("independent.co.uk")
  expect(url).toBeDefined()
  // console.log(url)
})