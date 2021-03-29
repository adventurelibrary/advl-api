module.exports = {
  transloadit: () => {
    const YAML = require('yamljs');
    const env = YAML.load('src/.env.yml');
    return {
      ...env.transloadit,
      ...env.elastic
    }
  }
}