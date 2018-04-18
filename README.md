# Sequoia Javascript Client SDK

[![Build Status](https://travis-ci.org/pikselpalette/sequoia-js-client-sdk.svg?branch=master)](https://travis-ci.org/pikselpalette/sequoia-js-client-sdk)
[![codecov](https://codecov.io/gh/pikselpalette/sequoia-js-client-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/pikselpalette/sequoia-js-client-sdk)
[![david-dm](https://david-dm.org/pikselpalette/sequoia-js-client-sdk.svg)](https://david-dm.org/pikselpalette/sequoia-js-client-sdk)

The sequoia-js-client-sdk provides convenient access to the Sequoia RESTful services through a set of JS abstractions. The JavaScript SDK lets you easily integrate Sequoia services into your website, webapp or node.js app.

## Install

`npm i @pikselpalette/sequoia-js-client-sdk`

## Usage

### Web

```javascript
// point to @pikselpalette/sequoia-js-client-sdk/dist/web/sequoia-client for a minified bundle
import Client from '@pikselpalette/sequoia-js-client-sdk/lib/client';
import { where, field } from '@pikselpalette/sequoia-js-client-sdk/lib/query';

// Create a client:
const client = new Client({
  directory: 'piksel',
  registryUri: 'https://registry-sandbox.sequoia.piksel.com'
});

client
  .login('username', 'password')
  .then(session => {
    // You can now query the session provided as the first argument (or
    // client.session); e.g. `session.isActive()`

    // Get a service::
    client.service('metadata').then(service => {
      // Get a resourceful endpoint (this is synchronous as the service passed
      // all the necessary data):
      const contents = service.resourcefulEndpoint('contents');

      contents
        .browse(
          where()
            .fields('title', 'mediumSynopsis', 'duration', 'ref')
            .include('assets')
            .page(1)
            .perPage(24)
            .orderByUpdatedAt()
            .desc()
            .count()
        )
        .then(collection => {
          // Do something with the ResourceCollection returned
        });
    });
  })
  .catch(error => {
    // Not logged in, inspect `error` to see why
  });
```

### In non-es6 module loader environments (e.g. node)

```javascript
// If you find a fetch alternative that works well with AWS, and is in active development, let us know.
// Until then, we are using isomorphic-fetch.
require('isomorphic-fetch');
const Client = require('@pikselpalette/sequoia-js-client-sdk/dist/node/sequoia-client.js');
const { where, field, param, textSearch } = Client;

// Create a client:
const client = new Client({
  directory: 'piksel',
  registryUri: 'https://registry-sandbox.sequoia.piksel.com',
  token: bearerToken
});

(async function init() {
  const service = await client.service('metadata');
  const contents = service.resourcefulEndpoint('contents');
  const collection = await contents.browse(
    where()
      .fields('title', 'mediumSynopsis', 'duration', 'ref')
      .include('assets')
      .page(1)
      .perPage(24)
      .orderByUpdatedAt()
      .desc()
      .count()
  );

  // Do something with the ResourceCollection returned
})();
```

## Development

Building:

```sh
  npm run build
```

Testing:

```sh
  npm run test
  npm run test:watch
```

Note, it is recommended to use node >= 6.6 to have proper handling for Promise
rejections in the tests

Mutation testing:

```sh
  npm run test:mutate
  npm run test:mutate -- --file=path/to/file/**/*.js
```

Generate documentation (jsdoc):

```sh
  npm run doc
```
