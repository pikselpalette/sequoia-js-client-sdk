# Migration notes

## 1.12.3 - Deprecated. Use 1.12.4

**This release is deprecated in favour of 1.12.4.**

1.12.3 included an upgrade of Babel which caused incompatibilities with users of Babel 6.

## Upgrading from 1.1._ to 1.2_

- Calls to client.service are now deprecated. Be aware that you are now passed an array with service descriptors, rather than a single service descriptor.
- Calls to registry.getService and registry.getServices are deprecated in favour of registry.getServiceDescriptor and registry.getServiceDescriptors.
