# Getting started

## Installation

```sh
npm install --save sequoia-client-sdk
```

## Basic Usage (get some filtered contents)
### In es6 module loader environments (webpack, rollup, browserify etc)

```javascript
import Client from 'sequoia-client-sdk/lib/client';
import { where, field } from 'sequoia-client-sdk/lib/query';

// Create a client:
const client = new Client('piksel',
                          'https://identity-sandbox.sequoia.piksel.com',
                          'https://registry-sandbox.sequoia.piksel.com');

client.login('username', 'password').then(session => {
  // You can now query the session provided as the first argument (or
  // client.session); e.g. `session.isActive()`

  // Get a service::
  client.service('metadata').then(service => {
    // Get a resourceful endpoint (this is synchronous as the service passed
    // all the necessary data):
    const contents = service.resourcefulEndpoint('contents');

    contents.browse(where().fields('title', 'mediumSynopsis','duration', 'ref')
                    .include('assets').page(1).perPage(24).orderByUpdatedAt().desc().count())
            .then(collection => {
              // Do something with the ResourceCollection returned
            });
  });
}).catch(error => {
  // Not logged in, inspect `error` to see why
});
```

### In non-es6 module loader environments (e.g. node)

```javascript
// Use e.g.  #!/usr/bin/env node --harmony_async_await

require('isomorphic-fetch');
const Client = require('sequoia-client-sdk/dist/sequoia-client.js');
const { where, field, param, textSearch } = Client;

// Create a client:
const client = new Client('piksel',
                          'https://identity-sandbox.sequoia.piksel.com',
                          'https://registry-sandbox.sequoia.piksel.com');

(async function init() {
  await client.generate(bearerToken);

  const service = await client.service('metadata');
  const contents = service.resourcefulEndpoint('contents');
  const collection = await contents.browse(where().fields('title', 'mediumSynopsis','duration', 'ref')
                    .include('assets').page(1).perPage(24).orderByUpdatedAt().desc().count());

  // Do something with the ResourceCollection returned
}());
```
