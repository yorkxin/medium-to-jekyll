const path = require('path');
const URL = require('url');
const cheerio = require('cheerio');
const moment = require('moment');

module.exports = class MetadataExtractor {
  constructor(html) {
    this.$ = cheerio.load(html);
  }

  toYAMLFrontMatter() {
    const frontMatter = {
      layout: 'post',
      title: this.title,
      published: this.isPublished
    };

    if (this.publishedAt) {
      frontMatter.date = moment.utc(this.publishedAt).local().format('YYYY-MM-DD HH:mm');
    }

    return frontMatter;
  }

  get title() {
    return this.$('title').text() || null;
  }

  get publishedAt() {
    return this.$('time.dt-published').attr('datetime') || null;
  }

  get canonicalLink() {
    return this.$('a.p-canonical').attr('href') || null;
  }

  get isPublished() {
    return !!this.publishedAt;
  }

  get slug() {
    if (!this.canonicalLink) {
      return null;
    }

    const pathInURL = URL.parse(this.canonicalLink).path;
    const lastSegment = decodeURIComponent(path.basename(pathInURL));

    // remove -xxxxxxxx
    return lastSegment.replace(/-[0-9a-f]+$/, '');
  }

  get looksLikeComment() {
    // Looks like comment?
    const cleanedTitle = this.title.trim().replace(/…$/, '');
    const allContent = this.$('.section-content > .section-inner > p:first-child').text().trim();
    return this.isPublished && allContent.startsWith(cleanedTitle);
  }

  get images() {
    return this.$('img').map((i, node) => this.$(node).attr('src')).get();
  }
}
