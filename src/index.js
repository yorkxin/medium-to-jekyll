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

    const context = {}

    const {convertResults} = await this.runConverterTasks(argv, context)
    this.log('Downloading files...')
    await this.runDownloadAssets(convertResults)
  }

  async runConverterTasks(filenames) {
    const tasks = new Listr({concurrent: true})

    for (let filename of filenames) {
      tasks.add({
        title: `Convert: ${path.basename(filename)}`,
        task: async (ctx, task) => {
          let result = null

          try {
            result = await this.convertFile(filename)
          } catch (error) {
            if (error instanceof NotAPostError) {
              task.skip('Skip, Not a post')
              return
            }

            throw error
          }

          task.title = `Converted to ~/${path.relative(os.homedir(), result.outputFilename)}`

          ctx.convertResults.push(result)
        },
      })
    }

    return tasks.run({convertResults: []})
  }

  async runDownloadAssets(convertResults) {
    const downloadTasks = new Listr({concurrent: false})

    for (const {downloadDir, assets} of convertResults) {
      if (assets.length === 0) {
        continue
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
    }

    return downloadTasks.run()
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
To convert:

1. Download your Medium export from https://medium.com/me/settings -> Download your information
2. Extract the zip archive
3. Run ./bin/run /path/to/medium-export/posts/*.html
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
    options: ['* * *', '---', '___'],
    default: '---',
    description: 'Markdown hr',
  }),
  'md-ul': flags.string({
    options: ['-', '+', '*'],
    default: '-',
    description: 'Markdown bulletListMarker',
  }),
  'md-code': flags.string({
    options: ['fenced', 'indented'],
    default: 'fenced',
    description: 'Markdown codeBlockStyle',
  }),
  'md-fence': flags.string({
    options: ['```', '~~~'],
    default: '```',
    description: 'Markdown fence',
  }),
  'md-em': flags.string({
    options: ['_', '*'],
    default: '_',
    description: 'Markdown emDelimiter',
  }),
  'md-strong': flags.string({
    options: ['**', '__'],
    default: '**',
    description: 'Markdown strongDelimiter',
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
