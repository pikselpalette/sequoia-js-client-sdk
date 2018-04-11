# Sequoia Javascript client

[![build status](https://gitlab.piksel.com/product-ignite/sequoia-js-client-sdk/badges/master/build.svg)](https://gitlab.piksel.com/product-ignite/sequoia-js-client-sdk/commits/master)
[![coverage report](https://gitlab.piksel.com/product-ignite/sequoia-js-client-sdk/badges/master/coverage.svg)](https://gitlab.piksel.com/product-ignite/sequoia-js-client-sdk/commits/master)

## Upgrading from 1.x

2.0.0 changes `./lib/transport.js` to be a class, rather than a global module. This should not be a breaking change, unless you're accessing transport directly.

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

## Usage

```javascript
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
// Use e.g.  #!/usr/bin/env node --harmony_async_await

require('isomorphic-fetch');
const Client = require('@pikselpalette/sequoia-js-client-sdk/dist/sequoia-client.js');
const { where, field, param, textSearch } = Client;

// Create a client:
const client = new Client({
  directory: 'piksel',
  registryUri: 'https://registry-sandbox.sequoia.piksel.com'
});

(async function init() {
  await client.generate(bearerToken);

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
