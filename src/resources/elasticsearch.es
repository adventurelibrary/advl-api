PUT /assets
PUT assets/_mapping 
{
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

PUT /bundleinfo
PUT bundleinfo/_mapping
{
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