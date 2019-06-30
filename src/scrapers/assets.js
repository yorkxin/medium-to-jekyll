const cheerio = require('cheerio')

module.exports.scrapeAssets = (
  html, {
    regexp = /.+/,
  }
) => {
  const $ = cheerio.load(html)

  /** @type {string[]} */
  return $('img')
  .map((i, node) => $(node).attr('src')).get()
  .filter(url => regexp.exec(url))
}
