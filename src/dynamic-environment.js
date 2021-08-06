const YAML = require('yamljs');
console.log(process.env.SLS_STAGE)
const env = (YAML.load('src/.env.yml'))['dev']; //CHANGE THIS WHEN DEPLOYING

module.exports = {
  transloadit: {
    ...env.transloadit,
    ...env.elastic,
    ...env.postgres,
  },
  database: {
    ...env.elastic,
    ...env.postgres,
    ...env.stripe,
    ...env.backblaze //needed for Asset init, which is in like all things
  }
}
