const path = require('path')
const fs = require('fs')
const os = require('os')
const {Command, flags} = require('@oclif/command')
const Listr = require('listr')
const rp = require('request-promise')
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

    const tasks = new Listr({concurrent: true})
    const downloadTasks = new Listr({concurrent: false})

    for (let filename of argv) {
      tasks.add({
        title: `Convert: ${path.basename(filename)}`,
        task: async (ctx, task) => {
          let assets = []
          let downloadDir = null

          try {
            const result = await this.convertFile(filename)
            task.title = `Converted to ~/${path.relative(os.homedir(), result.outputFilename)}`
            assets = result.assets
            downloadDir = result.downloadDir
          } catch (error) {
            if (error instanceof NotAPostError) {
              task.skip('Skip, Not a post')
              return
            }

            throw error
          }

          if (assets.length === 0) {
            return
          }

          downloadTasks.add({
            title: `mkdir -p ~/${path.relative(os.homedir(), downloadDir)}`,
            skip: () => {
              if (fs.existsSync(downloadDir)) {
                return 'Entry already exists'
              }
            },
            task: async () => fs.promises.mkdir(downloadDir, {recursive: true}),
          })

          for (let url of assets) {
            const localPath = this.determineDownloadPath(downloadDir, url)

            downloadTasks.add({
              title: `Download ${url} ...`,
              task: async (ctx, task) => {
                await this.downloadFile(url, localPath)
                task.title = `Downloaded to ~/${path.relative(os.homedir(), localPath)}`
              },
            })
          }
        },
      })
    }

    await tasks.run()

    this.log('Downloading files...')

    await downloadTasks.run()
  }

  async convertFile(filename) {
    const dirname = path.dirname(filename)
    const html = await fs.promises.readFile(filename, 'utf-8')

    const {metadata, assets, content} = await this.convertHTMLToMarkdown(html)
    const outputBasename = metadata.suggestedOutputBasename()

    // Write Markdown to file
    const outputFilename = path.resolve(dirname, outputBasename + '.md')
    await fs.promises.writeFile(outputFilename, content, 'utf-8')

    const downloadDir = this.determineDownloadDir(outputBasename, dirname)
    return {outputFilename, assets, downloadDir}
  }

  async convertHTMLToMarkdown(html) {
    const metadata = new MediumMetadata(html)

    if (!metadata.looksLikePost) {
      throw new NotAPostError()
    }

    const result = await convertMediumHTML(html, metadata, {
      languages: this.converterOptions.languages,
      turndownOptions: this.converterOptions.turndown,
      imageURLPrefix: this.converterOptions.imageURLPrefix,
    })

    return {metadata, ...result}
  }

  determineDownloadDir(outputBasename, dirname) {
    if (path.isAbsolute(this.converterOptions.imageDir)) {
      return path.resolve(this.converterOptions.imageDir, outputBasename)
    }

    return path.resolve(dirname, this.converterOptions.imageDir, outputBasename)
  }

  determineDownloadPath(downloadDir, url) {
    return path.resolve(downloadDir, path.basename(url))
  }

  /**
   *
   * @param {string} url remote URL to download
   * @param {string} localPath local path to file
   */
  async downloadFile(url, localPath) {
    const response = await rp.get({url, encoding: null})
    const buffer = Buffer.from(response, 'utf8')
    return fs.promises.writeFile(localPath, buffer)
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
