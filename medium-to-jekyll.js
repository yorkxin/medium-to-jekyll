#!/usr/bin/env node
// Requires Node 12+

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const TurndownService = require('turndown')
const {gfm} = require('turndown-plugin-gfm')

const MetadataExtractor = require('./metadata-extractor')
const MediumHelpers = require('./medium-helpers')
const {figure} = require('./turndown-figure')

const inputFilename = process.argv[2]
const inputDir = path.dirname(inputFilename)
const basename = path.basename(inputFilename, '.html')

const html = fs.readFileSync(inputFilename, 'utf-8')

const metadata = new MetadataExtractor(html)

if (metadata.looksLikeComment) {
  console.log('[Skip] Looks like a comment:', inputFilename)
  process.exit(0)
}

const outputFileBasename = MediumHelpers.suggestOutputFilename(basename, metadata)

if (!outputFileBasename) {
  throw `Unable to identify file name. Not a correct format? '${basename}'`
}

const outputFilename = path.join(inputDir, outputFileBasename + '.md')

const imageRelativeDir = path.join('images', outputFileBasename)
const imageAbsoluteDir = path.resolve(inputDir, imageRelativeDir)
const imageURLPrefix = path.join('/', 'images', outputFileBasename)

const localAssets = new Map(metadata.images.map(url => {
  return MediumHelpers.remoteAssetToLocalPath(url, imageURLPrefix)
}))

// TODO: make this a CLI option
const languageSubset = [
  'js', 'css', 'rb', 'sh', 'json', 'html', 'dockerfile',
]

const cleanedUpHTML = MediumHelpers.cleanupMediumHTML(html, {localAssets, languageSubset})

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

turndownService.use(gfm)
turndownService.use(figure)

const markdown = turndownService.turndown(cleanedUpHTML)
const frontMatter = yaml.safeDump(metadata.toYAMLFrontMatter())

const content = [
  '---',
  frontMatter,
  '---',
  '',
  markdown,
].join('\n')

fs.writeFileSync(outputFilename, content)

console.log('[Done] Exported to:', outputFilename)

if (localAssets.size > 0) {
  let listOfImages = ''

  for (let remoteURL of localAssets.keys()) {
    listOfImages += `${remoteURL}\n  dir=${imageAbsoluteDir}\n`
  }

  const imageOutputFile = path.join(inputDir, outputFileBasename + '.images.txt')
  fs.writeFileSync(imageOutputFile, listOfImages)
  console.log('[Done] Images list:', imageOutputFile)
}

