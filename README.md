# medium-to-jekyll

A CLI to convert Medium posts to Jekyll format

## WARNING: USE AT YOUR OWN RISK

This tool is a quick hack to satisfy my own needs. **Absolutely no warranty.**

Be sure to check the original posts and the converted Markdown files before you import into Jekyll.

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
./bin/run <path_to_archive>/posts/*.html
```

Markdown file will be saved under the same folder of the original HTML file.

After the conversion:

- Move the Markdown files to `_posts` of your Jekyll project
- Move the `images` folder to the root of your Jekyll project

Your Jekyll project folder structure should look like this:

```
.
├── _posts
│   └── 2019-06-20-my-awesome-article.md
└── images
    └── 2019-06-20-my-awesome-article
        └── 1*XXXXXXXX.png
```

## Features

### Image URL Rewriting

Images will be replaced with a reference to local path relative to
`/images/<markdown_file_name>`. This tool will collect all the download URLs
for you. Please download them separately.

For example, assuming that this tool converted your HTML file to
`2019-06-20-my-awesome-article.md`

```html
<img src="https://cdn-images-1.medium.com/max/2560/1*XXXXXXXX.png" />
```

will be replaced with

```html
<img src="/images/2019-06-20-my-awesome-article/1*XXXXXXXX.png" />
```

By running this tool, in addition to `2019-06-20-my-awesome-article.md`, the
above image files will be downloaded to
`./images/2019-06-20-my-awesome-article/1*XXXXXXXX.png`, under the same folder
as the input HTML file.

```
  --image-dir=image-dir
      [default: images] Image Directory prefix

  --image-url-prefix=image-url-prefix
      [default: /images] Image URL prefix
```

### Auto Programming Language Detection

Detects the programming language for the contents of fenced code block.

**Caveats**: In some cases it may detect the wrong language. Be sure to review
the Markdown result.

For example:

```html
<pre><code>
const foo = { bar: () => 'baz };
</code></pre>
```

May be detected as JavaScript, and generate:

    ```js
    const foo = { bar: () => 'baz };
    ```

Default language set is `js,css,html,py,rb,java,sql,go`

Language detection is done by
[Highlight.js](https://github.com/highlightjs/highlight.js).
See `./bin/run --help` for full list of languages.


```
  --[no-]detect-languages
      Disable programming language detection

  --languages=...
  [default: js,css,html,py,rb,java,sql,go] Programming languages to detect in code block
```

### Markdown Conversion

This tool uses [Turndown](https://github.com/domchristie/turndown) as the
Markdown converter.

The following Turndown options are supported:

```
  --md-code=fenced|indented
      [default: fenced] Markdown codeBlockStyle

  --md-em=_|*
      [default: _] Markdown emDelimiter

  --md-fence=```|~~~
      [default: ```] Markdown fence

  --md-hh=atx|settext
      [default: atx] Markdown headingStyle.

  --md-hr=* * *|---|___
      [default: ---] Markdown hr

  --md-link=inlined|referenced
      [default: inlined] Markdown linkStyle

  --md-ref=full|collapsed|shortcut
      [default: full] Markdown linkReferenceStyle

  --md-strong=**|__
      [default: **] Markdown strongDelimiter

  --md-ul=-|+|*
```

### Figure Handling

`<figure>` will by default be converted as HTML tags, to avoid missing
information on the resulting Markdown file.

Unfortunately, Markdown does not have a built-in `figure` syntax.

Aspect ratio won't be attained.

This tool provides the following modes:

- `no` = Convert to `<figure>`
- `alt` = Convert to image tag, embed `<figcaption>` text into `alt`
- `title` = Convert to image tag, embed `<figcaption>` text into `title`

Examples:

For the following tag in Medium HTML:

```html
<figure name="81a2" id="81a2" class="graf graf--figure graf-after--p">
  <div class="aspectRatioPlaceholder is-locked" style="max-width: 700px; max-height: 721px;">
    <div class="aspectRatioPlaceholder-fill" style="padding-bottom: 103%;"></div>
    <img class="graf-image" data-image-id="1*xxxxxxxx.png" data-width="1582" data-height="1630" data-is-featured="true" src="https://cdn-images-1.medium.com/max/800/1*xxxxxxxx.png">
  </div>
  <figcaption class="imageCaption">The quick brown fox jumps over the lazy dog</figcaption>
</figure>
```

Setting to `no`:

```md
<figure>
  <img alt="" src="/images/1*xxxxxxxx.png" title="" />
  <figcaption>The quick brown fox jumps over the lazy dog</figcaption>
</figure>
```

Setting to `alt`:

```md
![The quick brown fox jumps over the lazy dog](/images/1*xxxxxxxx.png)
```

Setting to `title`:

```md
![](/images/1*xxxxxxxx.png The quick brown fox jumps over the lazy dog)
```

CLI option:

```
  --md-figure=alt|title|no
      [default: no] Markdown figureStyle. "no" = use <figure> tag
```

## Conventions

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

### Tags

No tags will be imported to YAML front matter in the Markdown.

## License

MIT License. See [LICENSE](./LICENSE) file.
