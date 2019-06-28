const path = require('path')
const URL = require('url')
const cheerio = require('cheerio')
const moment = require('moment')

module.exports = class MetadataExtractor {
  constructor(html) {
    this.$ = cheerio.load(html)
  }

  toYAMLFrontMatter() {
    const frontMatter = {
      layout: 'post',
      title: this.title,
      published: this.isPublished,
    }

    if (this.publishedAt) {
      frontMatter.date = moment.utc(this.publishedAt).local().format('YYYY-MM-DD HH:mm')
    }

    return frontMatter
  }

  get title() {
    return this.$('title').text() || null
  }

  get publishedAt() {
    return this.$('time.dt-published').attr('datetime') || null
  }

  get canonicalLink() {
    return this.$('a.p-canonical').attr('href') || null
  }

  get isPublished() {
    return Boolean(this.publishedAt)
  }

  get slug() {
    if (!this.canonicalLink) {
      return null
    }

    const pathInURL = URL.parse(this.canonicalLink).path
    const lastSegment = decodeURIComponent(path.basename(pathInURL))

    // remove -xxxxxxxx
    return lastSegment.replace(/-[0-9a-f]+$/, '')
  }

  get looksLikeComment() {
    return this.$('[data-field=body] h3').length === 0
  }

  get images() {
    return this.$('img').map((i, node) => this.$(node).attr('src')).get()
  }
}
