import { Client } from '@elastic/elasticsearch';

if (!process.env.ELASTIC_CLOUD_ID) {
  throw new Error(`ELASTIC_CLOUD_ID is blank. Check your .env.yml, or make sure to use load-yaml-env.ts`)
}

if (!process.env.ELASTIC_USERNAME) {
  throw new Error(`ELASTIC_USERNAME is blank. Check your .env.yml, or make sure to use load-yaml-env.ts`)
}

if (!process.env.ELASTIC_PASSWORD) {
  throw new Error(`ELASTIC_PASSWORD is blank. Check your .env.yml, or make sure to use load-yaml-env.ts`)
}

export const search = new Client({
  cloud: {
    id: process.env.ELASTIC_CLOUD_ID
  },
  auth: {
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD
  }
})

export async function bulkIndex(index: string, items: any[], map?: (data) => any | undefined) {
  console.log(`Reindexing ${items.length} items to ${index}`)
  const body = items.flatMap((doc) => {
    const data = map ? map(doc) : doc
    return [{
      index: {
        _index: index,
        _id: doc.id
      }
    }, data]
  })


  const result = await search.bulk({
    refresh: true,
    body
  })

  if (result.body.errors) {
    throw new Error(`Search index returned errors` + JSON.stringify(result.body.items))
  }

  return result
}

export async function clearIndex (name: string) {
  console.log('clearing index', name)
  await search.deleteByQuery({
    index: name,
    type: '_doc',
    body: {
      query: {
        match_all: {}
      }
    }
  })
}
