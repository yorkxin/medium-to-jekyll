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
./medium-to-jekyll.js <path_to_archive>/posts/<your_post>.html
```

Markdown file will be saved under the same folder of the original HTML file.

### To convert multiple files at once

```sh
find <path_to_archive>/posts -name '*.html' -exec ./medium-to-jekyll.js {} \;
```

Move the `*.md` files to `_posts` folder of your Jekyll project.

**Be sure to download all image** to your local file system: (requires `aria2c`)

```sh
cat *.images.txt | aria2c --input-file -
```

Move the `images` folder to the root of your Jekyll project

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

### Images (Downloads to Local)

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

By running this tool, in addition to `2019-06-20-my-awesome-article.md`, there
will be a file named `2019-06-20-my-awesome-article.images.txt`, which is an
input for [`aria2c`](https://aria2.github.io). `aria2c (1)` can be installed by
`brew install aria2c` on macOS, or other package managers on your operating
system.

To download all images, run:

```sh
aria2c --input-file=2019-06-20-my-awesome-article.images.txt
```

The above image file will be downloaded to
`./images/2019-06-20-my-awesome-article/1*XXXXXXXX.png`, under the same folder
as the input HTML file.

Next, copy `images` folder to the root directory of Jekyll. (Don't forget to
copy the converted markdown files into `_posts` folder under Jekyll's root.)

Your folder structure should look like this:

```
.
├── _posts
│   └── 2019-06-20-my-awesome-article.md
└── images
    └── 2019-06-20-my-awesome-article
        └── 1*XXXXXXXX.png
```

### Tags

No tags will be imported to YAML front matter in the Markdown.

## License

MIT License. See [LICENSE](./LICENSE) file.
