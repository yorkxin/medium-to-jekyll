const cheerio = require('cheerio')

const hljs = require('highlight.js')

module.exports.detectCodeBlockLanguages = (html, languages = []) => {
  const $ = cheerio.load(html)

  // Detect programming language by dry-run Highlight.js
  $('pre > code').each((index, code) => {
    const highlighted = hljs.highlightAuto($(code).text(), languages)

    if (highlighted.language) {
      $(code).addClass(`language-${highlighted.language}`)
    }
  })

  return $.html()
}

module.exports.getSupportedLanguages = () => {
  return hljs
  .listLanguages()
  .map(language => {
    const aliases = hljs.getLanguage(language).aliases

    if (aliases) {
      return aliases.concat([language])
    }

    return [language]
  })
  .reduce((memo, current) => memo.concat(current), [])
  .sort()
}
