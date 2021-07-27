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



export const search = (() => {
  if(process.env.IS_OFFLINE){
    return new Client({
      node: process.env.ELASTIC_ENDPOINT
    })
  } else {
    return new Client({
      cloud: {
        id: process.env.ELASTIC_CLOUD_ID
      },
      auth: {
        username: process.env.ELASTIC_USERNAME,
        password: process.env.ELASTIC_PASSWORD
      }
    })
  }
})()


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
    body: body
  })

  if (result.body.errors) {
    throw new Error(`Search index returned errors` + JSON.stringify(result.body.items))
  }

  return result
}

export async function clearIndex (name: string) {
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

// When a new document is added to EC, it can take about 1s
// for the index it is added to to "refresh". This function
// forces the refresh of the index. This is so in our tests we can add
// data to the index, then force a refresh, then check if
// the data was added correctly
export async function refreshIndex (name: string) {
  await search.indices.refresh({
    index: name,
  })
}
