# medium-to-jekyll

A CLI to convert Medium posts to Jekyll format

## WARNING: USE AT YOUR OWN RISK

This tool is a quick hack to satisfy my own needs. **Absolutely no warranty.**

Be sure to check the original posts and the converted Markdown files before you import into Jekyll.

## Restrictions

### Contents that will be converted

- Only Medium Posts will be converted.
- Your comments on posts will not be converted.

### File name (slug, i.e. the last part of the URL)

- The file name will contain the slug string from the original Canonical URL on Medium.
- But the random string of the slug will be removed

For example:

If the original URL is

```
https://medium.com/@yourname/my-awesome-article-deadbeef123
```

Then the file name of Markdown file will be:

```
<date>-my-awesome-article.md
```

Where `date` is also extracted from the content of the HTML file.

### Header Escalation (`h3` becomes `h2`)

On Medium, the "Big Title" is rendered as `<h3>`, and "Small Title" is `<h4>`.
This converter will escalate all header level by 1, so that "Big Title" becomes `##` (`h2`) in Markdown.

### Draft posts

This tool identifies drafts by looking for "Published At" metadata in the HTML file of the post.
If that date is missing, then the post will be identified as "Draft", with the following features:

- File name will start with `draft-`, same as the original exported HTML file.
- In the YAML front matter of Markdown, there will be a `published: false` flag.

## System Requirements

- Node.js 12+
- UNIX Shell such as bash

## Install

```sh
npm install
```

## Usage

First, download your Medium archive from medium.com, then extract the zip file.

```sh
./medium-to-jekyll.js <path_to_archive>/posts/<your_post>.html
```

Markdown file will be saved under the same folder of the original HTML file.

### To convert multiple files at once

```sh
find <path_to_archive>/posts -name '*.html' -exec ./medium-to-jekyll.js {} \;
```

## License

MIT License. See [LICENSE](./LICENSE) file.
