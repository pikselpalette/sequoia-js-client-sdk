# Changelog

## Unreleased

* Upgrade build to use Node 10
* Replace query-string dependency with qs

## 1.4.0

* Add refreshServices method to registry

## 1.3.0

* Add setDirectory method on session to set the directory after client init.

## 1.2.0

* Add serviceDescriptors method in Client, more semantically correct way of getting service descriptors. Can handle passing a single service, and multiple services.
* Add corresponding getServiceDescriptor and getServiceDescriptors to the registry
* Deprecate client.service as it is less semantically accurate to serviceDescriptors and can only handle a single service.
* Deprecate registry.getService and registry.getServices in favour of getServiceDescriptor and getServiceDescriptors

## 1.1.0

* FIX: When used in Node, would cause Node process to not exit. Caused by the expiry warning timer.

## 1.0.0

* Package name changed to `@pikselpalette/sequoia-js-client-sdk`, released to github.
