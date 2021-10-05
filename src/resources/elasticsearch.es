DELETE /assets
DELETE /bundleinfo

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
        "fielddata": true,
        "fields": {
          "raw": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text",
        "fielddata": true
      },
      "uploaded": {
        "type": "text",
        "fielddata": true,
        "fields": {
          "raw": {
            "type":  "keyword"
          }
        }
      },
      "published_date": {
        "type": "text",
        "fielddata": true,
          "fields": {
          "raw": {
            "type":  "keyword"
          }
        }
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
