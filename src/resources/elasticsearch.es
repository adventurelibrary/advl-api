PUT /assets
{
  "settings": {
    "number_of_shards": 4,
    "number_of_replicas": 2
  },
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "fielddata": true
      },
      "description": {
        "type": "text",
        "fielddata": true
      }
    }
  }
}

PUT /bundleinfo
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "fielddata": true
      },
      "description": {
        "type" : "text",
        "fielddata": true
      }
    }
  }
}