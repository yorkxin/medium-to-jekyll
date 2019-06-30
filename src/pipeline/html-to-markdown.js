const TurndownService = require('turndown')
const {gfm} = require('turndown-plugin-gfm')
const {figure} = require('../lib/turndown-figure')

module.exports.htmlToMarkdown = (html, turndownOptions = {}) => {
  const turndownService = new TurndownService(turndownOptions)
  turndownService.use(gfm)
  turndownService.use(figure)
  return turndownService.turndown(html)
}
