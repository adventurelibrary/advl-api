# Adventure Library API

api.adventurelibrary.art/v1

# Assets

GET /assets/tags

- Returns the array of tags available

POST /assets/tags

- Send a list of tags to add to the db

GET /assets/categories

- Returns the array of categories available

POST /assets/categories

- Send a list of categories to add to the db

POST /assets/get_signature

- Send a pending asset to return a signature to use to upload the asset to Transloadit

GET /assets

- Query Paramters of attributes in interface Assest accepted. Will search and return assets based on those query paramaters

# Setup

- Run severless offline start
- dynamodb-admin
- ngrok for transloadit notify
