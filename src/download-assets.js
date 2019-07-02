const fs = require('fs')
const path = require('path')

/**
 *
 * @param {string} url remote URL to download
 * @param {string} localPath local file path to save to
 */
module.exports.downloadFile = async (url, localPath) => {
  const response = await rp.get({url, encoding: null})
  const buffer = Buffer.from(response, 'utf8')
  await fs.promises.writeFile(localPath, buffer)
  return localPath
}

/**
 *
 * @param {string[]} assets array of URLs to download
 * @param {string} downloadDir local directory
 */
module.exports.downloadAssets = async (assets, downloadDir) => {
  if (!fs.existsSync(downloadDir)) {
    await fs.promises.mkdir(downloadDir, {recursive: true})
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
