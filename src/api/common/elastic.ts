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
