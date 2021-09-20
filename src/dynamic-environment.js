const { exit } = require('process');
const YAML = require('yamljs');

if(!process.env.SLS_STAGE){
  console.log("\n\n\n\n\nSLS_STAGE not specified\n\n\n\n\n")
  exit(1);
}
const env = (YAML.load('src/.env.yml'))[process.env.SLS_STAGE];

module.exports = {
  transloadit: {
    ...env.transloadit,
    ...env.elastic,
    ...env.postgres,
    ...env.backblaze,
  },
  database: {
    ...env.elastic,
    ...env.postgres,
    ...env.stripe,
    ...env.backblaze //needed for Asset init, which is in like all things
  }
}
