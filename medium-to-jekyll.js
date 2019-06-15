#!/usr/bin/env node
// Requires Node 12+

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const TurndownService = require('turndown')
const { gfm } = require('turndown-plugin-gfm')

const MetadataExtractor = require('./metadata-extractor');
const turndownMedium = require('./turndown-medium');

const INPUT_FILENAME_FORMAT = /^(\d\d\d\d-\d\d-\d\d|draft)_/;

function suggestOutputFilename(originalFilename, metadata) {
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

const inputFilename = process.argv[2];
const inputDir = path.dirname(inputFilename);
const basename = path.basename(inputFilename, '.html');

const html = fs.readFileSync(inputFilename, 'utf-8');

const metadata = new MetadataExtractor(html);

if (metadata.looksLikeComment) {
  console.log('[Skip] Looks like a comment:', inputFilename);
  process.exit(0);
}

const suggestedOutputFileBasename = suggestOutputFilename(basename, metadata);

if (!suggestedOutputFileBasename) {
  throw `Unable to identify file name. Not a correct format? '${basename}'`;
}

const outputFilename = path.join(inputDir, suggestedOutputFileBasename + '.md');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-'
})

turndownService.use(gfm);
turndownService.use(turndownMedium);

const markdown = turndownService.turndown(html);
const frontMatter = yaml.safeDump(metadata.toYAMLFrontMatter());

const content = [
  '---',
  frontMatter,
  '---',
  markdown
].join("\n");

fs.writeFileSync(outputFilename, content);

console.log('[Done] Exported to', outputFilename);
