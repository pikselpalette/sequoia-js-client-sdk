import BusinessEndpoint from './business_endpoint.js';
import ResourcefulEndpoint from './resourceful_endpoint.js';

/**
 * Provides details of a Sequoia Service
 *
 * This class should not be used directly, but should instead be obtained
 * from {@link Client#service}
 *
 * @param {Transport} transport - Transport instance to use for fetching
 * @param {Object} data - JSON data returned from the service's raw description
 * e.g. https://metadata-sandbox.sequoia.piksel.com/descriptor/raw?owner=demo
 *
 * @property {Object} data - JSON data returned from the service's raw description
 * e.g. https://metadata-sandbox.sequoia.piksel.com/descriptor/raw?owner=demo
 *
 * @private
 */
class ServiceDescriptor {
  constructor(transport, data) {
    this.transport = transport;
    this.data = data;
  }

  /**
   * Get a {@link ResourcefulEndpoint} from a ServiceDescriptor
   *
   * @param {string} resourceName - e.g. 'contents' (the contents resourceful endpoint
   * from the meatatdata service)
   *
   * @returns {ResourcefulEndpoint}
   */
  resourcefulEndpoint(resourceName) {
    if (!this.data || !(resourceName in this.data.resourcefuls)) {
      return null;
    }

    const resourceful = this.data.resourcefuls[resourceName];
    resourceful.location = `${this.data.location}${resourceful.path}`;
    resourceful.tenant = this.data.tenant;

    return new ResourcefulEndpoint(this.transport, resourceful);
  }

  /**
   * Get an array of {@link ResourcefulEndpoint}s from a ServiceDescriptor
   *
   * @param {...string} resourceName - e.g. 'assets', 'contents' (the assets and contents resourceful endpoint
   * from the metadata service)
   *
   * @example
   * const [ assets, contents ] = service.resourcefulEndpoints('assets', 'contents');
   *
   * @returns {Array<ResourcefulEndpoint>}
   */
  resourcefulEndpoints(...resourceName) {
    const endpoints = resourceName.length
      ? resourceName
      : Object.keys(this.data.resourcefuls);

    return endpoints.map(r => this.resourcefulEndpoint(r));
  }

  /**
   * Get a {@link BusinessEndpoint} from a ServiceDescriptor
   *
   * @param {string} name - e.g. 'feeds' (the feeds business endpoint
   * from the gateway service)
   *
   * @returns {BusinessEndpoint}
   */
  businessEndpoint(endpointName, pathOptions) {
    const data = Object.assign({}, this.data);
    const { routes } = data;
    const endpoint = routes.find(route => route.name === endpointName);

    if (endpoint) {
      endpoint.location = this.data.location;
      endpoint.tenant = this.data.tenant;

      return new BusinessEndpoint(this.transport, endpoint, pathOptions);
    }

    return null;
  }

  /**
   * Get the list of resourcefuls for this ServiceDescriptor
   *
   * @todo This method isn't used and also does not return an array - it is not advised to use yet
   * @todo Should this return an array of ResourcefulEndpoints instead?
   *
   * @returns {Object[]} - a list of resourcefuls populated from the descriptor
   */
  resourcefuls() {
    return this.data.resourcefuls;
  }
}

/**
 * Access the Sequoia Registry based on the access of the current user
 *
 * @param {Transport} transport - Transport instance to use for fetching
 * @param {string} registryUri - URI of the Sequoia registry
 * e.g. https://registry-reference.sequoia.piksel.com
 * @param {boolean} cache - Indicate wether or not to cache descriptors
 *
 * @property {string} registryUri - URI of the Sequoia registry
 * e.g. https://registry-reference.sequoia.piksel.com
 * @property {Object[]} services - Services available in the environment
 * @property {Object} descriptors - JSON data returned from the service's raw description
 * e.g. https://metadata-reference.sequoia.piksel.com/descriptor/raw?owner=demo
 * @property {string} tenant - The name of the current tenancy being used e.g. 'demo'
 *
 * See the {@link https://registry-reference.sequoia.piksel.com/docs|Registry docs} for more info
 *
 */
class Registry {
  constructor(transport, registryUri, cache = false) {
    this.transport = transport;
    this.registryUri = registryUri;
    this.services = [];
    this.descriptors = {};
    this.cache = cache;
  }

  /**
   * Fetch the registry for this user in this tenancy
   *
   * @param {string} tenant - The name of the tenancy to use e.g. 'demo'
   *
   * @returns {Promise}
   */
  fetch(tenant) {
    this.tenant = tenant;

    return this.refreshServices();
  }

  getServiceLocation(serviceName) {
    const service = this.services.find(item => item.name === serviceName);

    if (service) {
      return service.location;
    }

    return null;
  }

  /**
   * Get ServiceDescriptor information from the registry.
   *
   * @deprecated Deprecated since 1.2.0. Use {@link Registry#getServiceDescriptor}
   *
   * Rejects the Promise if a service is requested that doesn't exist for this user
   * (or at all)
   *
   * @param {string} serviceName - The name of the service to use e.g. 'metadata'
   *
   * @returns {Promise}
   */
  getService(serviceName) {
    console.warn(
      'registry.getService is deprecated. Please use registry.getServiceDescriptor instead.'
    );
    return this.getServiceDescriptor(serviceName);
  }

  /**
   * Get ServiceDescriptor information from the SDK cache.
   *
   * Rejects the Promise if a service is requested that doesn't exist for this user
   * (or at all), or if the descriptor is not in the cache
   *
   * @param {string} serviceName - The name of the service to use e.g. 'metadata'
   *
   * @returns {Promise}
   */
  getCachedServiceDescriptor(serviceName) {
    const service = this.services.find(item => item.name === serviceName);

    if (service && this.descriptors[serviceName]) {
      return Promise.resolve(
        new ServiceDescriptor(this.transport, this.descriptors[serviceName])
      );
    }

    return Promise.reject(
      new Error(`No service with name ${serviceName} is in the cache`)
    );
  }

  /**
   * Get ServiceDescriptor information from the registry.
   *
   * Rejects the Promise if a service is requested that doesn't exist for this user
   * (or at all)
   *
   * @param {string} serviceName - The name of the service to use e.g. 'metadata'
   *
   * @returns {Promise}
   */
  getServiceDescriptor(serviceName) {
    const service = this.services.find(item => item.name === serviceName);

    if (service) {
      return this.transport
        .get(`${service.location}/descriptor/raw?owner=${this.tenant}`)
        .then((json) => {
          json.location = service.location;
          json.owner = service.owner;
          json.tenant = this.tenant;

          if (this.cache) {
            this.descriptors[serviceName] = json;
          }

          return new ServiceDescriptor(this.transport, json);
        });
    }

    return Promise.reject(
      new Error(`No service with name ${serviceName} exists`)
    );
  }

  /**
   * Get multiple ServiceDescriptor information from the registry.
   *
   * * @deprecated Deprecated since 1.2.0. Use {@link Registry#getServiceDescriptors}
   *
   * Rejects the Promise if a service is requested that doesn't exist for this user
   * (or at all)
   *
   * @param {...string} serviceName - The name of the service to use e.g. 'metadata'
   *
   * @returns {Promise}
   */
  getServices(...serviceName) {
    console.warn(
      'registry.getServices is deprecated. Please use registry.getServiceDescriptors instead.'
    );
    return this.getServiceDescriptors(...serviceName);
  }

  /**
   * Get multiple ServiceDescriptor information from the services endpoints.
   *
   * Rejects the Promise if a service is requested that doesn't exist for this user
   * (or at all)
   *
   * @param {...string} serviceName - The name of the service to use e.g. 'metadata'
   *
   * @returns {Promise}
   */
  getServiceDescriptors(...serviceName) {
    const services = serviceName.length
      ? serviceName
      : this.services.map(s => s.name);

    return Promise.all(services.map(s => this.getServiceDescriptor(s)));
  }

  /**
   * Get multiple ServiceDescriptor information from the SDK cache, falling back to the services endpoint.
   *
   * Rejects the Promise if a service is requested that doesn't exist for this user
   * (or at all)
   *
   * @param {...string} serviceName - The name of the service to use e.g. 'metadata'
   *
   * @returns {Promise}
   */
  getCachedServiceDescriptors(...serviceName) {
    const services = serviceName.length
      ? serviceName
      : this.services.map(s => s.name);

    return Promise.all(
      services.map(s => this.getCachedServiceDescriptor(s).catch(() => this.getServiceDescriptor(s)))
    );
  }

  /**
   * Refresh services that are cached inside the SDK.
   *
   * @returns {Promise}
   */
  refreshServices() {
    return this.transport
      .get(`${this.registryUri}/services/${this.tenant}`)
      .then((json) => {
        this.services = json.services;
        this.descriptors = {};

        return json;
      });
  }
}

export default Registry;

export { ServiceDescriptor };
