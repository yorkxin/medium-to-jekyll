const path = require('path');
const cheerio = require('cheerio');
const { highlightAuto } = require('highlight.js');

const INPUT_FILENAME_FORMAT = /^(\d\d\d\d-\d\d-\d\d|draft)_/;

module.exports.cleanupMediumHTML = function(html, options = {}) {
  /** @type {Map<String,String>|null} */
  const localAssets = options.localAssets || null;
  const languageSubset = options.languageSubset || [];

  const $ = cheerio.load(html);

  // Remove section divider which contains an <hr>
  $('.section--first > .section-divider').remove();

  // Remove the article title within body (Jekyll renders `title` as h1)
  $('.section--first h3.graf.graf--h3.graf--leading.graf--title').remove();

  // Escalate heading levels
  $('h3, h4, h5, h6').each((index, heading) => {
    const level = parseInt(/H(\d)/i.exec(heading.tagName)[1]);
    const newLevel = level - 1;
    heading.tagName = `h${newLevel}`;
  });

  // Remove <pre><br>
  $('pre > br, pre > code > br').replaceWith("\n");

  // Move <code> inside <pre> to the parent <pre>
  $('pre > code:only-child').each((index, code) => {
    $(code.parent).append(code.children);
    $(code).remove();
  });

  // Merge <pre /> + <pre /> to a single <pre>
  $('pre + pre').each((index, pre) => {
    const previousPre = pre.previousSibling;

    $(previousPre).append("\n\n", pre.children);
    $(pre).remove();
  });

  // Wrap content of <pre><code> again so that Turndown can identify it as fenced code
  $('pre').each((index, pre) => {
    const code = $('<code />');
    $(code).append(pre.children);
    $(pre.children).remove();
    $(pre).append(code);
  });

  // Detect programming language by dry-run Highlight.js
  $('pre > code').each((index, code) => {
    const highlighted = highlightAuto($(code).text(), languageSubset);

    console.debug('detected language:', highlighted.language)

    if (highlighted.language) {
      $(code).addClass(`language-${highlighted.language}`);
    }
  })

  // Merge <blockquote /> + <blockquote /> to a single <blockquote>
  $('blockquote + blockquote').each((index, blockquote) => {
    const previousBlockquote = blockquote.previousSibling;

    $(previousBlockquote).append("<br><br>", blockquote.children);
    $(blockquote).remove();
  });

  if (localAssets) {
    $('img').each((index, img) => {
      const remoteURL = $(img).attr('src');
      const localPath = localAssets.get(remoteURL);

      if (localPath) {
        $(img).attr('src', localPath);
      }
    });
  }

  return $('section[data-field=body]').html();
}

module.exports.suggestOutputFilename = function(originalFilename, metadata) {
  const matched = INPUT_FILENAME_FORMAT.exec(originalFilename);

  if (matched) {
    let slug = metadata.slug;
    if (!slug) {
      slug = metadata.title.replace(/([\u0000-\u002F]|[\u007b-\u00a0])+/g, '-').toLowerCase();
    }
    return `${matched[1]}-${slug}`
  } else {
    return null;
  }
};

module.exports.remoteAssetToLocalPath = function(remoteURL, prefix = '') {
  const basename = path.basename(remoteURL);
  const localPath = path.join(prefix, basename);

  return [
    remoteURL,
    localPath
  ];
}
