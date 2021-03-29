import { Client } from '@elastic/elasticsearch';

export const search = new Client({
  cloud: {
    id: process.env.ELASTIC_CLOUD_ID
  },
  auth: {
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD
  }
})