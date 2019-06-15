#!/usr/bin/env node
// Requires Node 12+

const fs = require('fs');
const path = require('path');
const URL = require('url');
const yaml = require('js-yaml');
const moment = require('moment');
const TurndownService = require('turndown')
const turndownPluginGfm = require('turndown-plugin-gfm')
const gfm = turndownPluginGfm.gfm

const inputFilename = process.argv[2];

process.on('uncaughtException', (err, origin) => {
  console.error('Failed to convert', inputFilename);
  console.error(' => ', err.message);
  console.error(' => ', err.stack);
  process.exit(1);
});

if (/\.html$/.test(inputFilename) === null) {
  throw 'input html plz.';
}

let title = 'Untitled';
let publishedAt = '';
let canonicalLink = null;

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-'
})

turndownService.use(gfm)
turndownService.remove(['style', 'header', 'footer']);
turndownService.remove((node) => {
  return node.tagName === 'SECTION' && node.dataset.field === 'subtitle';
});
turndownService.remove((node) => {
  return node.tagName === 'DIV' && node.className === 'section-divider';
});

let firstH3Killed = false;

// Escalate h3 to h2, h4 to h3, h5 to h4
turndownService.addRule('escalateHeaders', {
  filter: ['h3', 'h4', 'h5', 'h6'],
  replacement: (content, node) => {
    switch (node.nodeName) {
      case 'H3': {
        if (firstH3Killed) {
          return `## ${content}`
        } else {
          // Kill the first h3 we found, because it is a duplicate of post title
          firstH3Killed = true;
          return '';
        }
      }
      case 'H4': {
        return `### ${content}`
      }
      case 'H5': {
        return `#### ${content}`
      }
      case 'H6': {
        return `##### ${content}`
      }
    }
  }
});

turndownService.addRule('convertPreToFencedCode', {
  filter: ['pre'],
  replacement: (content, node) => {
    const codeLines = [];

    for (let child of node.childNodes) {
      if (child.nodeType === 3) { // text node
        codeLines.push(child.textContent);
      }
    }

    return [
      "```",
      ...codeLines,
      "```"
    ].join('\n') + "\n";
  }
});

turndownService.addRule('extractTitle', {
  filter: ['title'],
  replacement: (content) => {
    title = content;
    return '';
  }
});

turndownService.addRule('extractDate', {
  filter: (node, _options) => {
    return node.tagName === 'TIME' && node.className === 'dt-published'
  },
  replacement: (content, node, _options) => {
    const dateString = node.getAttribute('datetime')
    publishedAt = moment(dateString).utcOffset(9);
    return content;
  }
})

turndownService.addRule('extractCanonicalLink', {
  filter: (node, _options) => {
    return node.tagName === 'A' && node.className === 'p-canonical'
  },
  replacement: (content, node, _options) => {
    canonicalLink = node.getAttribute('href');
    return content;
  }
})

const inputDir = path.dirname(inputFilename);
const basename = path.basename(inputFilename);

const INPUT_FILENAME_FORMAT = /^(\d\d\d\d-\d\d-\d\d|draft)_(.+)\.html/;

const matchedInputFilename = INPUT_FILENAME_FORMAT.exec(basename);

const dateOrDraftInFilename = matchedInputFilename[1];

const input = fs.readFileSync(inputFilename, 'utf-8');

// Convert to Markdown to extract metadata
const markdown = turndownService.turndown(input);

if (markdown.trim().startsWith(title.trim().replace(/…$/, ''))) {
  console.log('Seems to be a comment, skip:', inputFilename);
  process.exit(0);
}

let slug;

if (canonicalLink) {
  // -5e1c53a62ef2
  const pathInURL = URL.parse(canonicalLink).path;
  const lastSegmentInPath = decodeURIComponent(path.basename(pathInURL));
  slug = lastSegmentInPath.replace(/-[0-9a-f]+$/, '');
} else {
  slug = title.toLowerCase().replace(/[/\\,._():;+=\[\] ]+/g, '-');
}

const outputFilename = path.join(inputDir, `${dateOrDraftInFilename}-${slug}.md`)

const frontMatter = {
  layout: 'post',
  title: title
};

if (publishedAt) {
  frontMatter['published'] = true;
  frontMatter['date'] = publishedAt.format('YYYY-MM-DD HH:mm');
}

const content = [
  '---',
  yaml.safeDump(frontMatter),
  '---',
  markdown
].join("\n");

fs.writeFileSync(outputFilename, content);

console.log('Exported to', outputFilename);
