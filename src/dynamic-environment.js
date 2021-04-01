const YAML = require('yamljs');
const env = YAML.load('src/.env.yml');

module.exports = {
  transloadit: {
    ...env.transloadit,
    ...env.elastic
  },
  asset_download_link: {
    ...env.elastic,
    ...env.backblaze
  },
  query_assets: {
    ...env.elastic,
    ...env.backblaze
  }
}