const {htmlToMarkdown} = require('./html-to-markdown')

const {scrapeAssets} = require('../scrapers/assets')
const {replaceAssets} = require('./replace-assets')
const MEDIUM_IMAGE_REGEXP = /^https:\/\/cdn-images-.+\.medium\.com/
const {markdownWithFrontMatter} = require('./markdown-with-frontmatter')

const {cleanupHTML} = require('./cleanup-html')
const {detectCodeBlockLanguages} = require('./detect-code-block-languages')

module.exports.convertMediumHTML = async (
  html,
  metadata, {
    languages = [],
    imageURLPrefix = '/images',
    turndownOptions = {},
  }
) => {
  const assets = scrapeAssets(html, {regexp: MEDIUM_IMAGE_REGEXP})

  const htmlWithNewAssetURLs = replaceAssets(html, {
    regexp: MEDIUM_IMAGE_REGEXP,
    urlPrefix: imageURLPrefix,
  })

  const bodyHTML = cleanupHTML(htmlWithNewAssetURLs)
  const htmlWithCodeLanguages = detectCodeBlockLanguages(bodyHTML, languages)
  const markdown = htmlToMarkdown(htmlWithCodeLanguages, turndownOptions)
  const content = markdownWithFrontMatter(markdown, metadata.toYAMLFrontMatter())

  return {
    content,
    assets,
  }
}
