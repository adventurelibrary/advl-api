const YAML = require('yamljs');
const env = YAML.load('src/.env.yml');

module.exports = {
  transloadit: {
    ...env.transloadit,
    ...env.elastic,
    ...env.postgres,
    ...env.db
  },
  asset_download_link: {
    ...env.elastic,
    ...env.backblaze,
    ...env.postgres,
    ...env.db
  },
  query_assets: {
    ...env.elastic,
    ...env.backblaze,
    ...env.postgres,
    ...env.db
  },
  user: {
    ...env.elastic,
    ...env.postgres,
    ...env.db
  },
  creator: {
    ...env.elastic,
    ...env.postgres,
    ...env.db
  }
}