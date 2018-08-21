[![Piksel Palette](https://pikselgroup.com/broadcast/wp-content/uploads/sites/3/2017/09/P-P.png)](https://piksel.com/product/piksel-palette/)

# Javascript Client SDK

[![npm version](https://badge.fury.io/js/%40pikselpalette%2Fsequoia-js-client-sdk.svg)](https://badge.fury.io/js/%40pikselpalette%2Fsequoia-js-client-sdk)
[![Build Status](https://travis-ci.org/pikselpalette/sequoia-js-client-sdk.svg?branch=master)](https://travis-ci.org/pikselpalette/sequoia-js-client-sdk)
[![codecov](https://codecov.io/gh/pikselpalette/sequoia-js-client-sdk/branch/master/graph/badge.svg)](https://codecov.io/gh/pikselpalette/sequoia-js-client-sdk)
[![david-dm](https://david-dm.org/pikselpalette/sequoia-js-client-sdk.svg)](https://david-dm.org/pikselpalette/sequoia-js-client-sdk)
[![david-dm-dev](https://david-dm.org/pikselpalette/sequoia-js-client-sdk/dev-status.svg)](https://david-dm.org/pikselpalette/sequoia-js-client-sdk?type=dev)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1d9499002e9441818cc46996ee0fe90e)](https://www.codacy.com/app/pikselpalette/sequoia-js-client-sdk?utm_source=github.com&utm_medium=referral&utm_content=pikselpalette/sequoia-js-client-sdk&utm_campaign=Badge_Grade) [![Greenkeeper badge](https://badges.greenkeeper.io/pikselpalette/sequoia-js-client-sdk.svg)](https://greenkeeper.io/)

This SDK provides convenient access to the [Piksel Palette](http://developer.pikselpalette.com/) RESTful services through a set of easy to use JS abstractions. You easily integrate Piksel Palette services into your website, webapp or node.js app and be running in no time.

## Documentation

In depth instructions and the full API can be found in our [developer
documentation](https://pikselpalette.github.io/sequoia-js-client-sdk/).

More information about Piksel Palette services is available in the [Piksel website](http://developer.pikselpalette.com/).

## Install

`npm i @pikselpalette/sequoia-js-client-sdk`

## Usage

### ES6 Web bundle (using webpack/browserify)

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

### Node/React Native

```javascript
// If you find a fetch alternative that works well with AWS, and is in active development, let us know.
// Until then, we are using isomorphic-fetch.
require('isomorphic-fetch');
const Client = require('@pikselpalette/sequoia-js-client-sdk/dist/node/sequoia-client');
const { where, field, param, textSearch } = Client;

// Create a client:
const client = new Client({
  directory: 'piksel',
  registryUri: 'https://registry-sandbox.sequoia.piksel.com',
  token: bearerToken
});

(async function init() {
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

### A note on fetch()

The SDK uses the [`WHATWG fetch() standard`](https://fetch.spec.whatwg.org/) which is available in most modern browsers, and in React Native. In order to use the SDK in older browsers, or in a Node environment where `fetch()` is not available, you need to supply your own `fetch()` polyfill.

Some choices are:

* [Isomorphic fetch](https://www.npmjs.com/package/isomorphic-fetch) - Web & Node
* [Cross Fetch](https://www.npmjs.com/package/cross-fetch) - Web & Node
* [WHATWG Fetch](https://www.npmjs.com/package/whatwg-fetch) - Web only

## Development

Built using Node 10. Use [avn](https://github.com/wbyoung/avn) to handle auto switching node versions.

Building:

```sh
  npm run build
```

Testing:

```sh
  npm run test
  npm run test:watch
```

Mutation testing:

```sh
  npm run test:mutate
  npm run test:mutate -- --file=path/to/file/**/*.js
```

Generate documentation (jsdoc):

```sh
  npm run doc
```

### Upgrading from 1.1._ to 1.2._

Calls to client.service are now deprecated. Be aware that you are now passed an array with service descriptors, rather than a single service descriptor.
Calls to registry.getService and registry.getServices are deprecated in favour of registry.getServiceDescriptor and registry.getServiceDescriptors.

## Samples

Here are some samples which make use of the SDK:

* [AWS Lambda function running on the `nodejs8.10` runtime.](https://github.com/pikselpalette/sequoia-js-client-sdk-sample-aws-lambda)
