// <figure>
//   <img
//   src="https://developer.mozilla.org/static/img/favicon144.png"
//   alt="The beautiful MDN logo.">
//   <figcaption>MDN Logo</figcaption>
// </figure>
const convertFigure = {
  filter: function(node, options) {
    return node.tagName == 'FIGURE' &&
      node.querySelector('img') &&
      node.querySelector('figcaption');
  },
  replacement: function (content, node, options) {
    const img = node.querySelector('img');
    const figcaption = node.querySelector('figcaption');
    const src = img.src;
    const alt = img.alt;
    const figcaptionNode = figcaption;
    const title = img.title;

    switch (options.figureStyle) {
      case 'alt': {
        // ![figcaption text or alt](image.png title)
        const altText = figcaptionNode.textContent || alt;
        return `![${altText}](${src} ${title})`;
      }

      case 'title': {
        // ![alt](image.png figcaption or title)
        const titleText = figcaptionNode.textContent || title;
        return `![${alt}](${src} ${title})`;
      }

      default: {
        // <figure>
        //   ![alt](src title)
        //   <figcaption>MDN Logo</figcaption>
        // </figure>

        let html = "";
        html += "<figure>\n";
        html += `  <img alt="${alt}" src="${src}" title="${title}" />\n`;
        html += `  <figcaption>${figcaptionNode.innerHTML}</figcaption>\n`;
        html += "</figure>\n";
        return html;
      }
    }
  }
};

module.exports.figure = function(turndownService) {
  turndownService.addRule('convertFigure', convertFigure);
}
