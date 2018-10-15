# Migration notes

## Upgrading from 1.1._ to 1.2_

- Calls to client.service are now deprecated. Be aware that you are now passed an array with service descriptors, rather than a single service descriptor.
- Calls to registry.getService and registry.getServices are deprecated in favour of registry.getServiceDescriptor and registry.getServiceDescriptors.
