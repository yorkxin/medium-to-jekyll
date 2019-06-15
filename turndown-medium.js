module.exports = function turndownMedium(turndownService) {
  turndownService.remove(['style', 'header', 'footer']);
  turndownService.remove(node => node.tagName === 'SECTION' && node.dataset.field === 'subtitle');
  turndownService.remove(node => node.tagName === 'DIV' && node.className === 'section-divider');

  let firstH3Killed = false;

  // Escalate h3 to h2, h4 to h3, h5 to h4
  turndownService.addRule('escalateHeaders', {
    filter: ['h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) => {
      switch (node.nodeName) {
        case 'H3': {
          if (firstH3Killed) {
            return `## ${content}`
          } else {
            // Kill the first h3 we found, because it is a duplicate of post title
            firstH3Killed = true;
            return '';
          }
        }
        case 'H4': {
          return `### ${content}`
        }
        case 'H5': {
          return `#### ${content}`
        }
        case 'H6': {
          return `##### ${content}`
        }
      }
    }
  });

  turndownService.addRule('convertPreToFencedCode', {
    filter: ['pre'],
    replacement: (content, node) => {
      const codeLines = [];

      for (let child of node.childNodes) {
        if (child.nodeType === 3) { // text node
          codeLines.push(child.textContent);
        }
      }

      return [
        "```",
        ...codeLines,
        "```"
      ].join('\n') + "\n";
    }
  });
};
