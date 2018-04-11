import fetchMock from 'fetch-mock';
import Client from '../../lib/client.js';
import Session from '../../lib/session.js';
import Registry, { Service } from '../../lib/registry.js';
import accessFixture from '../fixtures/access.json';
import metadataDescriptorFixture from '../fixtures/metadata-descriptor.json';
import servicesFixture from '../fixtures/services.json';
import tenantsFixture from '../fixtures/tenants.json';
import tokenFixture from '../fixtures/token.json';

describe('Client', () => {
  let client;
  const directory = 'fakeside-transavia';
  const identityUri = 'https://custom-identity.example.com';
  const registryUri = 'https://registry-sandbox.sequoia.piksel.com';
  const servicesUri = `${registryUri}/services/${directory}`;
  const testServicesUri = `${registryUri}/services/test`;
  const consoleServicesUri = `${registryUri}/services/console`;
  const accessUri = `${identityUri}/pauth/access`;
  const prodAccessUri = 'https://identity-euw1shared.sequoia.piksel.com/pauth/access';
  const tenantsUri = `${identityUri}/pauth/tenants`;
  const tokenUri = `${identityUri}/pauth/token`;
  const descriptorUri = 'https://metadata-euw1shared.sequoia.piksel.com/descriptor/raw?owner=fakeside-transavia';

  beforeEach(() => {
    fetchMock
      .mock(servicesUri, servicesFixture)
      .mock(testServicesUri, servicesFixture)
      .mock(consoleServicesUri, servicesFixture)
      .mock(`${accessUri}?tenants=fakeside-transavia`, accessFixture)
      .mock(`${prodAccessUri}?tenants=test`, accessFixture)
      .mock(`${prodAccessUri}?tenants=console`, accessFixture)
      .mock(tenantsUri, tenantsFixture)
      .mock(tokenUri, tokenFixture)
      .mock(descriptorUri, metadataDescriptorFixture);

    client = new Client({ directory, registryUri, identityUri });
  });

  afterEach(fetchMock.restore);

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
      expect(client.session.registry).toEqual(expect.any(Registry));
    });

    it('should accept an optional `identityUri` and set the `identityUri` property', () => {
      client = new Client({ directory, registryUri });

      expect(client.transport).toBeDefined();
      expect(client.session.identityUri).not.toBeDefined();
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
        jest.spyOn(client.registry, 'getService');

        const serviceName = 'metadata';

        await expect(client.service(serviceName)).resolves.toEqual({
          asymmetricMatch: actual => actual instanceof Service && actual.data.name === serviceName
        });

        expect(client.registry.getService).toHaveBeenCalledWith(serviceName);
      });

      it("should reject when the service doesn't exist in the registry", async () => {
        const serviceName = 'thisdoesnotexist';

        return expect(client.service(serviceName)).rejects.toEqual(new Error('No service with name thisdoesnotexist exists'));
      });
    });

    describe('logout', () => {
      it('should return a destroyed session', () => {
        expect(client.session.isActive()).toBe(true);

        jest.spyOn(client.session, 'destroy');

        const session = client.logout();

        expect(client.session.destroy).toHaveBeenCalled();
        expect(session).toEqual(expect.any(Session));
        expect(session.token).toBeNull();
        expect(client.session.isActive()).toBe(false);
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
