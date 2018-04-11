# Changelog

## v2.4.2 - 2018-04-11

* Fix accumulation of resources without linked resources on `ResourcefulEndpoint.all()`

## v2.4.1 - 2018-04-10

* Fix accumulation of linked resources on `ResourcefulEndpoint.all()`

## v2.4.0 - 2018-04-03

* Allow client.generate() to be called without a token for an anonymous client

## v2.3.0 - 2018-03-06

* Check whether a tenant exists before we set the tenant

## v2.2.0 - 2018-03-06

* Add setDirectory to Session.directory, so we can change the directory after init

## v2.1.3 - 2018-03-05

### Enhancements

* Changed test suite to jest instead of jasmine/karma
* Added mutation testing using Stryker
* Increased code coverage for unit tests

## v2.1.2 - 2018-02-15

### Fixes

**ResourcefulEndpoint**

* `all` - methods such as `destroy()` work with fixed ResourceCollections

## v2.1.1 - 2018-02-13

### Fixes

**ResourcefulEndpoint**

* `all` - results are now ok according there is no more referenced value
  incorrectly updated

## v0.3.0 - 2017-06-05

### Enhancements

**Registry and Services**
Fetch multiple services or ResourcefulEndpoints in one go (returns an array
of them)

**ResourcefulEndpoint**

* `newResourceCollection` - create a new ResourceCollection
* `all` - like `browse` but will iterate over all pages of data and return a
  giant ResourceCollection with everything from the server

**ResourceCollection**

* `save` - save all resources in the collection to the server
* `validate` - validate all resources
* `destroy` - delete everything in this collection on the server

* `explode` - return an array of ResourceCollections in the specified batch
  size (e.g. 100)

**Local collection methods** - useful for local manipulation of a collection
before then saving back to the server

* `add` - add a Resource to the local collection
* `remove` - remove a Resource from the local collection
* `find` - find the first Resource in the collection by ref
* `findOrCreate` - find a resource or create (and add) to the local collection
* `findWhere` - find the first Resource in the collection matching criteria

### Deprecations

* ResourcefulEndpoint#serialiseResource is now deprecated See
  Resource#serialise for its replacement

## v0.2.2 - 2017-05-25

### Fixes

* ResourceCollection now correctly replaces the owner paramater on queries
  to Sequoia even if it appears as the first query string parameter

## v0.2.1 - 2017-05-17

### Fixes

* Resource was using an internal getter called `fields`. This caused an
  issue with resourcfuls such as feeds that had a property of `fields`
  (Object.assign() would break trying to assign to this property).
  Resource now used a method `getResourceFields` internally to fix this.

## v0.2.0 - 2017-02-26

### Enhancements

* ResourcefulEndpoint#newResource will now default the `owner` field for
  the Resource object to the current tenancy name

### Fixes

* README now shows that isomorphic-fetch is required when using node
* Correct some examples and update docs on caveats for switching tenancies
  during operations
* Correct spelling of parameter

## v0.1.0 - 2017-01-23

### Enhancements

* [Breaking change] `client.setTenancy()` now returns a Promise so that the
  registry is correctly updated when switching tenancies.

### Fixes

* Documentation for anonymous usage has been updated

## v0.0.7 - 2017-01-11

### Enhancements

* `client.login()` (`session.authenticateWithCredentials()`) now supports
  'pauth' and 'oauth' straegies. It is recommended to _only_ use the 'oauth'
  strategy on the server-side as you will need to provide the client secret,
  which is not something endusers should be provided with.
* `client.login()` now supports overriding the identity URL so you can hit a
  custom auth endpoint, as long as it provides a JSON response with an
  `access_token` key.

## v0.0.6 - 2017-01-09

### Fixes

* Resource#hasLinked() now properly returns a boolean
* Linked items for Resources in a ResourceCollection use the correct
  relationship value rather than being explicitly set to `contentRef`
* Improve ResourceCollection's documentation for how `linked` Resources are
  appended

## v0.0.5 - 2017-01-03

### Enhancements

* Validation can now be performed client-side (instead of just letting
  remote Sequoia endpoints do this). Information from the descriptor
  is used to perform this validation. Use `Resource#validate()` to
  asynchronously (Promise) validate a whole Resource or
  `Resource#validateField(<fieldName>)` to synchronously check a specific
  field.

## v0.0.4 - 2017-01-02

### Enhancements

* Implement linking between resources (adding relationships). You can now
  link one or more Resources together, no matter if the link is direct or
  indirect. e.g. content.link(asset) is as valid as asset.link(content)

### Fixes

* Use hyphenatedPluralName for endpoints (just pluralName was incorrect)
* Handle 204 responses (empty payload no longer blows up when trying to call
  .json() after destroying a resource, for example)

## v0.0.3 - 2016-11-11

### Enhancements

* Add a BusinessEndpoint class to interact with non resourceful endpoints
  e.g. `service.businessEndpoint('feeds', { name: 'UTV-15246' })`
* Add gitlab-ci
* 100% unit test coverage
* ResourcefulEndpoints now correctly persist Resources
* Include UMD es5 version of the library under dist/ for usage outside of
  webpack/browserify etc

### Fixes

* No longer hardcode 'contents' as the resourceful collection to pick up
  in queries - use the resourceful's `pluralName`. This allows every
  resourceful endpoint to be queried correctly.
* Persisting objects now works as the Resource is now correctly serialised

## v0.0.2 - 2016-09-19

### Enhancements

* Add ResourceCollection to help with pagination of a resourceful endpoints
  `browse` mechanism.
* Introduce `Query.and` to concatenate multiple field queries
* Further improve JSDoc

### Fixes

* `Resource.toJSON()` no longer stack overflows with infinite recursion when
  called without a ResourcefulEndpoint property

## v0.0.1 - 2016-08-23

* Initial project created.
* Auth session: authenticate via pauth or existing bearer token
* Query registry for available services
* Fluent interface for query Resourceful endpoints returned from a Sequoia
  Service
