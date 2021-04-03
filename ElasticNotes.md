# New Index
PUT index-name
- when doing this in production, specify shards else it'll only do 1 shard

# GET Doc
GET /index-name/_doc/id

# Get All Assets
GET /assets/_search
{
  "query": {
    "match_all": {
    }
  }
}

# Make mapping fielddata true to allow for sorting by it
PUT assets/_mapping 
{
  "properties": {
    "name": {
      "type": "text",
      "fielddata": true
    }
  }
}
