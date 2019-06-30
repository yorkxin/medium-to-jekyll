const yaml = require('js-yaml')

module.exports.markdownWithFrontMatter = (markdown, frontMatter) => {
  const frontMatterYAML = yaml.safeDump(frontMatter)

  return [
    '---',
    frontMatterYAML,
    '---',
    '',
    markdown,
  ].join('\n')
}
