# Changelog

## Unreleased

## 1.15.1

- Reverted commit e52b5f5f529a122216faec4a171b23cc2fbe17ce since it was breaking some exports.

## 1.15.0

- Modified `resourceful_endpoint`'s `criteriaToQuery` function to accept an owner query param in criteria.

## 1.14.2

- Fix bug with direct relationships containing `through` fields (`filterName` is only required in `indirect` relationships).

## 1.14.1

- Fix bug with `through` relationships, allowing `string` types for related fields.

## 1.14.0

- Add `resetPassword()` to `Client`.

## 1.13.0

- Add `changePassword()` to `Client`.

## 1.12.5

- Set indices to false when stringifying query in addRelatedThroughFields method in Query class as it was generating invalid API queries for arrays with more than 20 items.

## 1.12.4

- Roll back Babel (and associated deps) to 6.x as they cause incompatibilities with users of the client running Babel 6.

## 1.12.3

- Fix a bug with `ResourcefulEndpoint.all()` where it could miss the final page of results.

## 1.12.2

- Fix an issue with nested queries where they would be transformed from `a.b=c` to `a[b]=c`.

## 1.12.1

- Reimplement `ResourcefulEndpoint.all()` to avoid Promise recursion memory issues.

## 1.12.0

- Add `continue()` to `Query` to allow simple initiation of continuation paging.

## 1.11.1

- Fix through relationship handling, when no fields are specified this is the equivalent to returning all fields and must be honoured if a related through field is add to the browse query

## 1.11.0

- When a Sequoia service returns `meta.continue` in the response, follow this for the next page if `meta.next` is not also present.

## 1.10.1

- Adjust through relationship logic to use the relationship filter name to determine the fieldNamePath which needs to be filtered against - this field will not always be present on the originating resource's fields

## 1.10.0

- Add `encodeUri` configuration option. Will cause the client to automatically encode request urls it generates.
- Add addRelatedThroughFields to the Query class, update logic in resourceful_endpoint browse method to use this method to fetch additional fields required on included through relationships to support their use with graphical display descriptors for example.

## 1.9.0

- Proper error message returned when a request is failed (taken from response.body.message)

## 1.8.0

- Add optional descriptor caching

## 1.7.0

- Added ability to pass an array of records to ResourcefulEndpoint.newResourceCollection()
- Deprecated passing an object with pluralName to ResourcefulEndpoint.newResourceCollection()

## 1.6.0

- Add ability to specify a batchSize when calling ResourceCollection.save()

## 1.5.0

- Upgrade build to use Node 10
- Replace query-string dependency with qs
- Add codacy badge to README.md

## 1.4.0

- Add refreshServices method to registry

## 1.3.0

- Add setDirectory method on session to set the directory after client init.

## 1.2.0

- Add serviceDescriptors method in Client, more semantically correct way of getting service descriptors. Can handle passing a single service, and multiple services.
- Add corresponding getServiceDescriptor and getServiceDescriptors to the registry
- Deprecate client.service as it is less semantically accurate to serviceDescriptors and can only handle a single service.
- Deprecate registry.getService and registry.getServices in favour of getServiceDescriptor and getServiceDescriptors

## 1.1.0

- FIX: When used in Node, would cause Node process to not exit. Caused by the expiry warning timer.

## 1.0.0

- Package name changed to `@pikselpalette/sequoia-js-client-sdk`, released to github.
