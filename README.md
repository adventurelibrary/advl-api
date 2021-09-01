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

- Run `sls offline start`
- Run `dynamodb-admin` to access dynamodb
- ngrok for transloadit notify

# Ava Tests
Run `npx ava` to run the tests. The sls offline server must be up and running.

You can sync up the ElasticSearch before running your rests by visiting `http://localhost:3000/v1/assets/sync` in your browser.

To run specific tests you can modify the test files themselves and call `test.only(...` instead of `test(...`

You can specify which tests to run from the command line with `npx ava --match "asset*"`. Prefixes all test strings with, for example, "asset:" or "user:", allows for easier matching.

Tests are added to the `testing` folder. You can **ignore files in the testing folder** by adding them to the `ava.files` prop in package.json with a ! prefix.

## Faster Tests
If you only want to run tests in a particular file, it can speed up your tests to edit the `package.json` file's `ava` section. Edit the `files` attribute of that object to only point to the file you're testing, and remove the wildcard entry. Do **not** commit this.

## Reindexing
To clear the all assets and bundles from Elastic Search and then reindex from the database you can run `npm run reindex` 
