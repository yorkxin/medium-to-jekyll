const {Command, flags} = require('@oclif/command')
const hljs = require('highlight.js')

class MediumToJekyllCommand extends Command {
  async run() {
    const {flags, argv} = this.parse(MediumToJekyllCommand)
    this.log(flags, argv)

    // TODO: If args.input == '-' then read from STDIN
    // Otherwise treat them as array
  }
}

MediumToJekyllCommand.description = `Converts Medium Post(s) into Jekyll markdown format.
...
Extra documentation goes here
`

MediumToJekyllCommand.ALL_LANGUAGES = hljs.listLanguages()
.map(language => {
  const aliases = hljs.getLanguage(language).aliases

  if (aliases) {
    return aliases.concat([language])
  }

  return [language]
})
.reduce((memo, current) => memo.concat(current), [])
.sort()

MediumToJekyllCommand.DEFAULT_LANGUAGES = [
  'js', 'css', 'html', 'py', 'rb', 'java', 'sql', 'go',
]

MediumToJekyllCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({
    char: 'v',
  }),
  // add --help flag to show CLI version
  help: flags.help({
    char: 'h',
  }),
  figure: flags.string({
    options: ['alt', 'title', 'no'],
    default: 'no',
    description: '<figure> processing method',
  }),
  'image-url-prefix': flags.string({
    default: 'images',
    description: 'Image URL prefix',
  }),
  'image-dir': flags.string({
    default: 'images',
    description: 'Image Directory prefix',
  }),
  languages: flags.string({
    multiple: true,
    options: MediumToJekyllCommand.ALL_LANGUAGES,
    default: MediumToJekyllCommand.DEFAULT_LANGUAGES,
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
    default: 'dashes',
    description: 'Markdown hr',
  }),
  'md-ul': flags.string({
    options: ['dash', 'plus', 'asterisk'],
    default: 'dash',
    description: 'Markdown bulletListMarker',
  }),
  'md-code': flags.string({
    options: ['fenced', 'indented'],
    default: 'fenced',
    description: 'Markdown codeBlockStyle',
  }),
  'md-fence': flags.string({
    options: ['backtick', 'tilde'],
    default: 'backtick',
    description: 'Markdown fence',
  }),
  'md-em': flags.string({
    options: ['underscore', 'asterisk'],
    default: 'underscore',
    description: 'Markdown emDelimiter',
  }),
  'md-strong': flags.string({
    options: ['asterisk', 'underscore'],
    default: 'asterisk',
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
