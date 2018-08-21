# Getting started

## Installation

```sh
npm install --save @pikselpalette/sequoia-js-client-sdk
```

## Basic Usage (get some filtered contents)

### In es6 module loader environments (webpack, rollup, browserify etc)

```javascript
import Client from '@pikselpalette/sequoia-js-client-sdk/lib/client';
import { where, field } from '@pikselpalette/sequoia-js-client-sdk/lib/query';

// Create a client:
const client = new Client({
  directory: 'piksel',
  registryUri: 'https://identity-sandbox.sequoia.piksel.com'
});

client
  .login('username', 'password')
  .then(session => {
    // You can now query the session provided as the first argument (or
    // client.session); e.g. `session.isActive()`

    // Get a service::
    client.serviceDescriptors('metadata').then([metadata] => {
      // Get a resourceful endpoint (this is synchronous as the service passed
      // all the necessary data):
      const contents = metadata.resourcefulEndpoint('contents');

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
  registryUri: 'https://identity-sandbox.sequoia.piksel.com'
});

(async function init() {
  await client.generate(bearerToken);

  const services = await client.serviceDescriptors('metadata');
  const contents = services[0].resourcefulEndpoint('contents');
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
