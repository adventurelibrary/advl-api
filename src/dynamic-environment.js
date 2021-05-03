const YAML = require('yamljs');
const env = YAML.load('src/.env.yml');

module.exports = {
  transloadit: {
    ...env.transloadit,
    ...env.elastic,
    ...env.postgres,
  },
  asset_download_link: {
    ...env.elastic,
    ...env.backblaze,
    ...env.postgres,
  },
  query_assets: {
    ...env.elastic,
    ...env.backblaze,
    ...env.postgres,
  },
  user: {
    ...env.elastic,
    ...env.postgres,
  },
  creator: {
    ...env.elastic,
    ...env.postgres,
  },
  database: {
    ...env.elastic,
    ...env.postgres
  }
}