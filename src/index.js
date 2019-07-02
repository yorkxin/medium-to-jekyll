const path = require('path')
const fs = require('fs')
const {Command, flags} = require('@oclif/command')
const {downloadAssets} = require('./download-assets')
const MediumMetadata = require('./scrapers/metadata')
const {getSupportedLanguages} = require('./pipeline/detect-code-block-languages')
const {convertMediumHTML} = require('./pipeline/convert-medium-html')

class NotAPostError extends Error {}

class MediumToJekyllCommand extends Command {
  async run() {
    const {flags, argv} = this.parse(MediumToJekyllCommand)

    if (argv.length === 0) {
      this._help()
    }

    this.converterOptions = this.flagsToConverterOptions(flags)

    this.debug(this.converterOptions)

    for (let filename of argv) {
      this.debug('file', filename)

      try {
        // need sequential
        // eslint-disable-next-line no-await-in-loop
        const {outputFilename, downloadResults} = await this.convertFile(filename)
        this.log('[Done] Converted to', outputFilename)

        downloadResults.forEach(result => {
          if (result.status === 'ok') {
            this.log('>> [Asset] Downloaded to', result.localPath)
          } else {
            this.error('>> [Asset] Failed to download', result.url)
          }
        })
      } catch (error) {
        if (error instanceof NotAPostError) {
          this.log("Skip: Doesn't look like a post")
          continue
        }

        throw error
      }
    }
  }

  async convertFile(filename) {
    const dirname = path.dirname(filename)
    const html = await fs.promises.readFile(filename, 'utf-8')

    const metadata = new MediumMetadata(html)
    const outputBasename = metadata.suggestedOutputBasename()

    if (!metadata.looksLikePost) {
      throw new NotAPostError()
    }

    const result = await convertMediumHTML(html, metadata, {
      languages: this.converterOptions.languages,
      turndownOptions: this.converterOptions.turndown,
      imageURLPrefix: this.converterOptions.imageURLPrefix,
    })

    // Write Markdown to file
    const outputFilename = path.resolve(dirname, outputBasename + '.md')
    await fs.promises.writeFile(outputFilename, result.content, 'utf-8')

    let downloadResults = []

    // Download assets
    if (result.assets.length !== 0) {
      const downloadDir = this.determineDownloadDir(outputBasename, dirname)
      downloadResults = await downloadAssets(result.assets, downloadDir)
    }

    return {outputFilename, downloadResults}
  }

  determineDownloadDir(outputBasename, dirname) {
    if (path.isAbsolute(this.converterOptions.imageDir)) {
      return path.resolve(this.converterOptions.imageDir, outputBasename)
    }

    return path.resolve(dirname, this.converterOptions.imageDir, outputBasename)
  }

  flagsToConverterOptions(flags) {
    return {
      imageURLPrefix: flags['image-url-prefix'],
      imageDir: flags['image-dir'],
      languages: flags.languages,
      turndown: {
        headingStyle: flags['md-hh'],
        hr: flags['md-hr'],
        bulletListMarker: flags['md-ul'],
        codeBlockStyle: flags['md-code'],
        fence: flags['md-fence'],
        emDelimiter: flags['md-em'],
        strongDelimiter: flags['md-strong'],
        linkStyle: flags['md-link'],
        linkReferenceStyle: flags['md-ref'],
        figureStyle: flags['md-figure'],
      },
    }
  }
}

MediumToJekyllCommand.description = `Converts Medium Post(s) into Jekyll markdown format.
...
Extra documentation goes here
`

MediumToJekyllCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({
    char: 'v',
  }),
  // add --help flag to show CLI version
  help: flags.help({
    char: 'h',
  }),
  'image-url-prefix': flags.string({
    default: '/images',
    description: 'Image URL prefix',
  }),
  'image-dir': flags.string({
    default: 'images',
    description: 'Image Directory prefix',
  }),
  languages: flags.string({
    multiple: true,
    options: getSupportedLanguages(),
    default: [
      'js', 'css', 'html', 'py', 'rb', 'java', 'sql', 'go',
    ],
    description: 'Programming languages to detect in code block',
  }),
  'detect-languages': flags.boolean({
    description: 'Disable programming language detection',
    default: true,
    allowNo: true,
  }),
  'md-hh': flags.string({
    options: ['atx', 'settext'],
    default: 'atx',
    description: 'Markdown headingStyle.',
  }),
  'md-hr': flags.string({
    options: ['asterisks', 'dashes', 'underscores'],
    default: '---',
    description: 'Markdown hr',
    parse: input => {
      return {
        asterisks: '* * *',
        dashes: '---',
        underscores: '___',
      }[input]
    },
  }),
  'md-ul': flags.string({
    options: ['dash', 'plus', 'asterisk'],
    default: '-',
    description: 'Markdown bulletListMarker',
    parse: input => {
      return {
        dash: '-',
        plus: '+',
        asterisk: '*',
      }[input]
    },
  }),
  'md-code': flags.string({
    options: ['fenced', 'indented'],
    default: 'fenced',
    description: 'Markdown codeBlockStyle',
  }),
  'md-fence': flags.string({
    options: ['backtick', 'tilde'],
    default: '```',
    description: 'Markdown fence',
    parse: input => {
      return {
        backtick: '```',
        tilde: '~~~',
      }[input]
    },
  }),
  'md-em': flags.string({
    options: ['underscore', 'asterisk'],
    default: '_',
    description: 'Markdown emDelimiter',
    parse: input => {
      return {
        underscore: '_',
        asterisk: '*',
      }[input]
    },
  }),
  'md-strong': flags.string({
    options: ['asterisk', 'underscore'],
    default: '**',
    description: 'Markdown strongDelimiter',
    parse: input => {
      return {
        asterisk: '**',
        underscore: '__',
      }[input]
    },
  }),
  'md-link': flags.string({
    options: ['inlined', 'referenced'],
    default: 'inlined',
    description: 'Markdown linkStyle',
  }),
  'md-ref': flags.string({
    options: ['full', 'collapsed', 'shortcut'],
    default: 'full',
    description: 'Markdown linkReferenceStyle',
  }),
  'md-figure': flags.string({
    options: ['alt', 'title', 'no'],
    default: 'no',
    description: 'Markdown figureStyle. "no" = use <figure> tag',
  }),
}

MediumToJekyllCommand.args = [
  {
    name: 'FILE...',
    description: 'Input files. Can specify multiple.',
  },
]

// Allow multiple args
MediumToJekyllCommand.strict = false

module.exports = MediumToJekyllCommand
