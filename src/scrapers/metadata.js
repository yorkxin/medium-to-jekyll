const path = require('path')
const URL = require('url')
const cheerio = require('cheerio')
const moment = require('moment')

// eslint-disable-next-line no-control-regex
const STRIP_TITLE = /([\u0000-\u002F]|[\u007b-\u00a0])+/g

function generateSlugFromTitle(title) {
  return title.replace(STRIP_TITLE, '-').toLowerCase()
}

function extractSlugFromCanonicalLink(link) {
  const pathInURL = URL.parse(link).path
  const lastSegment = decodeURIComponent(path.basename(pathInURL))

  // remove -xxxxxxxx
  return lastSegment.replace(/-[0-9a-f]+$/, '')
}

module.exports = class MediumMetadata {
  constructor(html) {
    const $ = cheerio.load(html)

    this.title = $('title').text() || null
    this.publishedAtRaw = $('time.dt-published').attr('datetime') || null

    if (this.publishedAtRaw) {
      this.isPublished = true
      this.localPublishedAt = moment.utc(this.publishedAt).local()
    } else {
      this.isPublished = false
      this.localPublishedAt = null
    }

    this.canonicalLink = $('a.p-canonical').attr('href') || null

    if (this.canonicalLink) {
      this.slug = extractSlugFromCanonicalLink(this.canonicalLink)
    } else if (this.title) {
      this.slug = generateSlugFromTitle(this.title)
    } else {
      this.slug = null
    }

    this.looksLikeComment = ($('[data-field=body] h3').length === 0)
  }

  toYAMLFrontMatter() {
    const frontMatter = {
      layout: 'post',
      title: this.title,
      published: this.isPublished,
    }

    if (this.isPublished) {
      frontMatter.date = this.localPublishedAt.format('YYYY-MM-DD hh:mm')
    }

    return frontMatter
  }

  suggestedOutputBasename() {
    const suffix = this.slug || generateSlugFromTitle(this.title)

    return `${this.outputNamePrefix()}-${suffix}`
  }

  outputNamePrefix() {
    if (this.isPublished) {
      return this.localPublishedAt.format('YYYY-MM-DD')
    }

    return 'draft'
  }
}
