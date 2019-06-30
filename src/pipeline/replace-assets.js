const path = require('path')
const cheerio = require('cheerio')

module.exports.replaceAssets = (
  html, {
    regexp = /.+/,
    urlPrefix = '/images',
  }
) => {
  const $ = cheerio.load(html)

  $('img').each((index, img) => {
    const remoteURL = $(img).attr('src')

    if (!regexp.exec(remoteURL)) {
      return
    }

    const basename = path.basename(remoteURL)

    $(img).attr('src', path.join(urlPrefix, basename))
  })

  return $.html()
}
