const path = require('path')
const fs = require('fs')
const rp = require('request-promise')
const fsPromises = require('fs').promises
const {Command, flags} = require('@oclif/command')
const MediumMetadata = require('./scrapers/metadata')
const {getSupportedLanguages} = require('./pipeline/detect-code-block-languages')
const {convertMediumHTML} = require('./pipeline/convert-medium-html')

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
      // need sequential
      // eslint-disable-next-line no-await-in-loop
      await this.convertFile(filename)
    }
  }

  async convertFile(filename) {
    const dirname = path.dirname(filename)
    const html = await fsPromises.readFile(filename, 'utf-8')

    const metadata = new MediumMetadata(html)

    if (metadata.looksLikeComment) {
      this.log('Skip: Looks like a comment.')
      return null
    }

    const result = await convertMediumHTML(html, metadata, {
      languages: this.converterOptions.languages,
      turndownOptions: this.converterOptions.turndown,
      imageURLPrefix: this.converterOptions.imageURLPrefix,
    })

    this.debug('metadata:', result.metadata)
    this.debug('assets:', result.assets)

    const outputBasename = result.metadata.suggestedOutputBasename()
    const outputFilename = path.resolve(dirname, outputBasename + '.md')
    await fsPromises.writeFile(outputFilename, result.content, 'utf-8')

    this.debug('wrote:', outputFilename)

    if (result.assets.length > 0) {
      let downloadDir

      if (path.isAbsolute(this.converterOptions.imageDir)) {
        downloadDir = path.resolve(this.converterOptions.imageDir, outputBasename)
      } else {
        downloadDir = path.resolve(dirname, this.converterOptions.imageDir, outputBasename)
      }

      const downloadResults = await this.downloadAssets(result.assets, downloadDir)

      this.debug('Download Results:', downloadResults)

      downloadResults.forEach(result => {
        if (result.status === 'ok') {
          this.log('[Download Succeeded] Asset downloaded to', result.localPath)
        } else {
          this.error('[Download Failed] Could not download', result.url)
        }
      })
    }

    this.log('[Done] Converted to', outputFilename)
  }

  /**
   *
   * @param {string[]} assets array of URLs to download
   * @param {string} downloadDir local directory
   */
  async downloadAssets(assets, downloadDir) {
    if (!fs.existsSync(downloadDir)) {
      await fsPromises.mkdir(downloadDir, {recursive: true})
      this.log('> mkdir', downloadDir)
    }

    return Promise.all(assets.map(async url => {
      const localPath = path.resolve(downloadDir, path.basename(url))

      try {
        await this.downloadFile(url, localPath)
        return {status: 'ok', url, localPath}
      } catch (error) {
        return {status: 'error', url, localPath, error: error}
      }
    }))
  }

  /**
   *
   * @param {string} url remote URL to download
   * @param {string} localPath local file path to save to
   */
  async downloadFile(url, localPath) {
    const response = await rp.get({url, encoding: null})
    const buffer = Buffer.from(response, 'utf8')
    await fsPromises.writeFile(localPath, buffer)
    return localPath
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
