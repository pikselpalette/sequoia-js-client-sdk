import fetchMock from 'fetch-mock';
import differenceInMilliseconds from 'date-fns/difference_in_milliseconds';
import Client from '../../lib/client.js';
import Session from '../../lib/session.js';
import Registry, { ServiceDescriptor } from '../../lib/registry.js';
import accessFixture from '../fixtures/access.js';
import metadataDescriptorFixture from '../fixtures/metadata-descriptor.json';
import paymentDescriptorFixture from '../fixtures/payment-descriptor.json';
import servicesFixture from '../fixtures/services.json';
import tenantsFixture from '../fixtures/tenants.json';
import tokenFixture from '../fixtures/token.json';

jest.useFakeTimers();

describe('Client', () => {
  let client;
  const directory = 'fakeside-transavia';
  const identityUri = 'https://custom-identity.example.com';
  const registryUri = 'https://registry-sandbox.sequoia.piksel.com';
  const servicesUri = `${registryUri}/services/${directory}`;
  const testServicesUri = `${registryUri}/services/test`;
  const demoServicesUri = `${registryUri}/services/demo`;
  const consoleServicesUri = `${registryUri}/services/console`;
  const accessUri = `${identityUri}/pauth/access`;
  const prodAccessUri = 'https://identity-euw1shared.sequoia.piksel.com/pauth/access';
  const tenantsUri = `${identityUri}/pauth/tenants`;
  const tokenUri = `${identityUri}/pauth/token`;
  const descriptorUri = 'https://metadata-euw1shared.sequoia.piksel.com/descriptor/raw?owner=fakeside-transavia';
  const paymentDescriptorUri = 'https://payment-euw1shared.sequoia.piksel.com/descriptor/raw?owner=fakeside-transavia';

  beforeEach(() => {
    fetchMock
      .mock(servicesUri, servicesFixture)
      .mock(testServicesUri, servicesFixture)
      .mock(demoServicesUri, servicesFixture)
      .mock(consoleServicesUri, servicesFixture)
      .mock(`${accessUri}?tenants=fakeside-transavia`, accessFixture)
      .mock(`${prodAccessUri}?tenants=test`, accessFixture)
      .mock(`${prodAccessUri}?tenants=console`, accessFixture)
      .mock(tenantsUri, tenantsFixture)
      .mock(tokenUri, tokenFixture)
      .mock(descriptorUri, metadataDescriptorFixture)
      .mock(paymentDescriptorUri, paymentDescriptorFixture);

    client = new Client({
      directory,
      registryUri,
      identityUri
    });
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create a `session` property as a new Session instance', () => {
      expect(client.transport).toBeDefined();
      expect(client.session).toEqual(expect.any(Session));
      expect(client.session.directory).toEqual(directory);
      expect(client.session.identityUri).toEqual(identityUri);
    });

    it('should create a `registry` property as a new Registry instance', () => {
      expect(client.transport).toBeDefined();
      expect(client.registry).toEqual(expect.any(Registry));
      expect(client.registry.registryUri).toEqual(registryUri);
      expect(client.registry.cache).toBe(false);
      expect(client.session.registry).toEqual(expect.any(Registry));
    });

    it('should pass the enableCache value to registry', () => {
      client = new Client({
        directory,
        registryUri,
        identityUri,
        enableCache: true
      });
      expect(client.registry.cache).toBe(true);
    });

    it('should pass the encodeUri value to Transport', () => {
      client = new Client({
        directory,
        registryUri,
        identityUri,
        encodeUri: true
      });
      expect(client.transport.encodeUri).toBe(true);
    });

    it('should accept an optional `identityUri`', () => {
      client = new Client({ directory, registryUri });

      expect(client.transport).toBeDefined();
      expect(client.session.identityUri).not.toBeDefined();
    });

    it('should set the tenancy if passed a tenancy', () => {
      client = new Client({ directory, registryUri, tenant: 'demo' });
      expect(client.registry.tenant).toEqual('demo');
    });

    it('should generate credentials if passed a token', () => {
      client = new Client({ directory, registryUri, token: 'demo' });
      expect(client.registry.transport.defaults.headers.authorization).toEqual('Bearer demo');
    });
  });

  describe('login', () => {
    it('should resolve with an active session', async () => {
      expect(client.session.isActive()).toBe(false);

      await expect(client.login('test', 'test')).resolves.toEqual({
        asymmetricMatch: actual => actual instanceof Session && actual.isActive() === true
      });

      expect(client.session.isActive()).toBe(true);
    });
  });

  describe('generate', () => {
    it('should resolve with an active session', async () => {
      expect(client.session.isActive()).toBe(false);

      await expect(client.generate('testtoken')).resolves.toEqual({
        asymmetricMatch: actual => actual instanceof Session && actual.isActive() === true
      });
      expect(client.session.isActive()).toBe(true);
    });

    it('should resolve with an active session if given null', async () => {
      expect(client.session.isActive()).toBe(false);

      await client.setTenancy(directory);
      await expect(client.generate()).resolves.toEqual({
        asymmetricMatch: actual => actual instanceof Session && actual.isActive() === false
      });
      expect(client.session.isActive()).toBe(false);
    });
  });

  describe('logged in method', () => {
    beforeEach(async () => client.generate('testtoken'));

    describe('service', () => {
      it('should resolve with a service from the registry', async () => {
        jest.spyOn(client.registry, 'getServiceDescriptor');

        const serviceName = 'metadata';

        await expect(client.service(serviceName)).resolves.toEqual({
          asymmetricMatch: actual => actual instanceof ServiceDescriptor && actual.data.name === serviceName
        });

        expect(client.registry.getServiceDescriptor).toHaveBeenCalledWith(serviceName);
      });

      it("should reject when the service doesn't exist in the registry", async () => {
        const serviceName = 'thisdoesnotexist';

        return expect(client.serviceDescriptors(serviceName)).rejects.toEqual(new Error('No service with name thisdoesnotexist exists'));
      });
    });

    describe('serviceDescriptors', () => {
      it('should resolve with services from the registry', async () => {
        jest.spyOn(client.registry, 'getServiceDescriptors');

        await expect(client.serviceDescriptors('metadata')).resolves.toEqual([
          {
            asymmetricMatch: actual => actual instanceof ServiceDescriptor && actual.data.name === 'metadata'
          }
        ]);

        expect(client.registry.getServiceDescriptors).toHaveBeenCalledWith('metadata');
      });

      it('should resolve with multiple service from the registry', async () => {
        jest.spyOn(client.registry, 'getServiceDescriptors');

        await expect(client.serviceDescriptors('metadata', 'payment')).resolves.toEqual([
          {
            asymmetricMatch: actual => actual instanceof ServiceDescriptor && actual.data.name === 'metadata'
          },
          {
            asymmetricMatch: actual => actual instanceof ServiceDescriptor && actual.data.name === 'payment'
          }
        ]);

        expect(client.registry.getServiceDescriptors).toHaveBeenCalledWith('metadata', 'payment');
      });

      it("should reject when the service doesn't exist in the registry", async () => {
        const serviceName = 'thisdoesnotexist';

        return expect(client.service(serviceName)).rejects.toEqual(new Error('No service with name thisdoesnotexist exists'));
      });
    });

    describe('cachedServiceDescriptors', () => {
      beforeEach(() => {
        client.registry.descriptors = {
          metadata: { name: 'metadata' },
          payment: { name: 'payment' }
        };
        jest.spyOn(client.registry, 'getCachedServiceDescriptors');
      });

      it('should resolve with services from the cache', async () => {
        await expect(client.cachedServiceDescriptors('metadata')).resolves.toEqual([
          {
            asymmetricMatch: actual => actual instanceof ServiceDescriptor && actual.data.name === 'metadata'
          }
        ]);

        expect(client.registry.getCachedServiceDescriptors).toHaveBeenCalledWith('metadata');
      });

      it('should resolve with multiple services from the cache', async () => {
        await expect(client.cachedServiceDescriptors('metadata', 'payment')).resolves.toEqual([
          {
            asymmetricMatch: actual => actual instanceof ServiceDescriptor && actual.data.name === 'metadata'
          },
          {
            asymmetricMatch: actual => actual instanceof ServiceDescriptor && actual.data.name === 'payment'
          }
        ]);

        expect(client.registry.getCachedServiceDescriptors).toHaveBeenCalledWith('metadata', 'payment');
      });

      it("should reject when the service doesn't exist in the registry", async () => {
        const serviceName = 'thisdoesnotexist';

        return expect(client.cachedServiceDescriptors(serviceName)).rejects.toEqual(new Error('No service with name thisdoesnotexist exists'));
      });
    });

    describe('onExpiryWarning', () => {
      it('should call onExpiryWarning when token about to expire', () => {
        const callback = jest.fn();
        const expiry = differenceInMilliseconds(client.session.access.expiresAt, new Date());
        client.onExpiryWarning(callback);
        expect(callback).not.toBeCalled();

        jest.advanceTimersByTime(expiry);

        expect(callback).toBeCalledWith(client.session.access);
      });

      it('should cancel callback onExpiryWarning', async () => {
        const callback = jest.fn();
        const expiry = differenceInMilliseconds(client.session.access.expiresAt, new Date());
        await client.onExpiryWarning(callback);
        expect(callback).not.toBeCalled();

        await client.onExpiryWarning(null);
        jest.advanceTimersByTime(expiry);

        expect(callback).not.toBeCalled();
      });
    });

    describe('logout', () => {
      it('should return a destroyed session', async () => {
        expect(client.session.isActive()).toBe(true);

        await client.onExpiryWarning(() => {});
        const { expiryWarningRef } = client.session;
        expect(expiryWarningRef).not.toBeNull();

        jest.spyOn(client.session, 'destroy');

        const session = client.logout();

        expect(client.session.destroy).toHaveBeenCalled();
        expect(session).toEqual(expect.any(Session));
        expect(session.token).toBeNull();
        expect(client.session.isActive()).toBe(false);
        expect(clearTimeout).toBeCalledWith(expiryWarningRef);
        expect(session.expiryWarningRef).toBeNull();
      });
    });

    describe('setTenancy', () => {
      beforeEach(() => {
        jest.spyOn(client.registry, 'fetch');
      });

      it('should set the `currentTenant` property on the session', async () => {
        await expect(client.setTenancy('test')).resolves.toEqual({
          asymmetricMatch: actual => actual instanceof Session && actual.isActive() === true
        });
        expect(client.session.currentTenant.name).toEqual('test');
        await expect(client.setTenancy('console')).resolves.toEqual({
          asymmetricMatch: actual => actual instanceof Session && actual.isActive() === true
        });
        expect(client.session.currentTenant.name).toEqual('console');
      });

      it('should update the registry', async () => {
        await expect(client.setTenancy('test')).resolves.toBeTruthy();
        expect(client.registry.fetch).toHaveBeenCalledWith('test');
      });

      it("should throw an error if tenant is not in the client's tenants", async () => {
        client.registry.services = [];

        await expect(client.setTenancy('noTenantHere')).rejects.toThrow('Tenant does not exist');
        expect(client.registry.fetch).not.toHaveBeenCalledWith('test');
      });

      it('should throw an error if we pass setTenancy nothing', async () => {
        client.registry.services = [];

        await expect(client.setTenancy()).rejects.toThrow('Tenant does not exist');
        expect(client.registry.fetch).not.toHaveBeenCalledWith('test');
      });

      // TODO: test failure scenarios (not logged in, invalid tenancy)
    });

    describe('setDirectory', () => {
      it('should set the `directory` property on the session', () => {
        expect(client.session.directory).toEqual(directory);
        client.setDirectory('new-directory');
        expect(client.session.directory).toEqual('new-directory');
      });
    });
  });
});
