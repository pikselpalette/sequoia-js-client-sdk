import fetchMock from 'fetch-mock';
import Registry from '../../lib/registry.js';
import Session, { NO_OAUTH_SECRET_PROVIDED } from '../../lib/session.js';
import Transport from '../../lib/transport.js';
import accessFixture from '../fixtures/access.js';
import servicesFixture from '../fixtures/services.json';
import tenantsFixture from '../fixtures/tenants.json';
import tokenFixture from '../fixtures/token.json';

jest.useFakeTimers();


describe('session', () => {
  const directory = 'test';
  const registryUri = 'https://registry-sandbox.sequoia.piksel.com';
  const servicesUri = `${registryUri}/services/${directory}`;
  const identityUri = 'http://localhost';
  const accessUri = `${identityUri}/pauth/access`;
  const accessWithTenantUri = `${identityUri}/pauth/access?tenants=fakeside-transavia`;
  const tenantsUri = `${identityUri}/pauth/tenants`;
  const tokenUri = `${identityUri}/pauth/token`;
  const oauthTokenUri = `${identityUri}/oauth/token`;
  const customTokenUri = 'http://example.com/login';
  let transport;
  let session;
  let registry;
  const secret = 'somebase64secret==';

  beforeEach(() => {
    transport = new Transport();

    fetchMock
      .mock(accessUri, accessFixture)
      .mock(accessWithTenantUri, accessFixture)
      .mock(servicesUri, servicesFixture)
      .mock(tenantsUri, tenantsFixture)
      .mock(tokenUri, tokenFixture)
      .mock(oauthTokenUri, tokenFixture)
      .mock(customTokenUri, tokenFixture);

    registry = new Registry(transport, registryUri);
    session = new Session(transport, directory, registry, identityUri);
  });

  afterEach(() => {
    fetchMock.restore();
    session.destroy();
    session.access = null;
    jest.clearAllTimers();
    clearTimeout.mockClear();
  });

  describe('constructor', () => {
    it('should set initial values', () => {
      expect(session.transport).toEqual(transport);
      expect(session.directory).toEqual(directory);
      expect(session.identityUri).toEqual(identityUri);
      expect(session.token).toBe(null);
      expect(session.tenants).toEqual([]);
      expect(session.access).toEqual({});
      expect(session.currentTenantName).toBe(null);
    });
  });

  describe('authenticateWithCredentials', () => {
    beforeEach(() => {
      jest.spyOn(session, 'authenticateWithToken');
    });

    it('should "POST" to identity', async () => {
      expect(session.isActive()).toBe(false);
      await expect(session.authenticateWithCredentials('test', 'password')).resolves.toEqual(session);

      expect(fetchMock.called(tokenUri)).toBe(true);
      expect(session.authenticateWithToken).toHaveBeenCalledWith(tokenFixture.access_token);

      expect(session.isActive()).toBe(true);
    });

    it('should default to the "pauth" strategy', async () => {
      await expect(session.authenticateWithCredentials('test', 'password')).resolves.toEqual(session);

      expect(fetchMock.called(tokenUri)).toBe(true);
      expect(fetchMock.lastOptions(tokenUri).body).toEqual('{"username":"test\\\\test","password":"password"}');
      expect(session.authenticateWithToken).toHaveBeenCalledWith(tokenFixture.access_token);

      expect(session.isActive()).toBe(true);
    });

    it('should support the "oauth" strategy with end user grant', async () => {
      await expect(session.authenticateWithCredentials('test', 'password', { strategy: 'oauth', secret })).resolves.toEqual(session);

      expect(fetchMock.called(oauthTokenUri)).toBe(true);
      const { body, headers } = fetchMock.lastOptions(oauthTokenUri);
      expect(body).toEqual('grant_type=password&username=test\\test&password=password');
      expect(headers.authorization).toEqual(`Basic ${secret}`);
      expect(headers['Content-Type']).toEqual('application/x-www-form-urlencoded');
      expect(session.authenticateWithToken).toHaveBeenCalledWith(tokenFixture.access_token);

      expect(session.isActive()).toBe(true);
    });

    it('should support the "oauth" strategy with client credentials grant when no username or password is supplied', async () => {
      await expect(session.authenticateWithCredentials(null, null, { strategy: 'oauth', secret })).resolves.toEqual(session);

      expect(fetchMock.called(oauthTokenUri)).toBe(true);
      const { body, headers } = fetchMock.lastOptions(oauthTokenUri);
      expect(body).toEqual('grant_type=client_credentials');
      expect(headers.authorization).toEqual(`Basic ${secret}`);
      expect(headers['Content-Type']).toEqual('application/x-www-form-urlencoded');
      expect(session.authenticateWithToken).toHaveBeenCalledWith(tokenFixture.access_token);

      expect(session.isActive()).toBe(true);
    });

    it('should allow the url for the endpoint to be overridden', async () => {
      await expect(session.authenticateWithCredentials('test', 'password', { url: customTokenUri })).resolves.toEqual(session);

      expect(fetchMock.called(customTokenUri)).toBe(true);

      fetchMock.resetHistory();

      await expect(session.authenticateWithCredentials('test', 'password', {
        url: customTokenUri,
        strategy: 'oauth',
        secret
      })).resolves.toEqual(session);

      expect(fetchMock.called(customTokenUri)).toBe(true);
    });

    it('should reject when no secret is provided for oauth login', async () => {
      expect(session.authenticateWithCredentials('test', 'password', { strategy: 'oauth' })).rejects.toEqual(NO_OAUTH_SECRET_PROVIDED);
    });
  });

  describe('setDirectory', () => {
    it('should set the directory of the session', () => {
      const testDirectory = 'test2';
      expect(session.directory).toEqual('test');
      session.setDirectory(testDirectory);
      expect(session.directory).toEqual(testDirectory);
    });
  });

  describe('authenticateWithToken', () => {
    beforeEach(() => {
      jest.spyOn(session, 'populateTenants');
    });

    it('should add the authorization header and return a populated, active Session instance', async () => {
      const testToken = 'testtoken';

      expect(session.isActive()).toBe(false);

      await expect(session.authenticateWithToken(testToken)).resolves.toEqual(session);

      expect(session.transport.defaults.headers).toEqual(expect.objectContaining({ authorization: `Bearer ${testToken}` }));
      expect(session.populateTenants).toHaveBeenCalled();

      expect(session.token).toEqual(testToken);
      expect(session.isActive()).toBe(true);
    });

    it('should not add the authorization header if no token is passed', async () => {
      expect(session.isActive()).toBe(false);

      await expect(session.authenticateWithToken()).resolves.toEqual(session);

      expect(session.transport.defaults.headers).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/vnd.piksel+json'
      });
      expect(session.populateTenants).toHaveBeenCalled();

      expect(session.token).toEqual(null);
      expect(session.isActive()).toBe(false);
    });
  });

  describe('populateTenants', () => {
    it('should populate the tenancy info when token set', async () => {
      session.token = 'token';
      expect(session.tenants).toEqual([]);

      await expect(session.populateTenants()).resolves.toBeFalsy();

      expect(fetchMock.called(tenantsUri)).toBe(true);

      expect(session.tenants).not.toEqual([]);
      expect(session.tenants).toEqual(expect.arrayContaining([
        expect.objectContaining({
          ref: 'root:showcase-demo1',
          owner: 'root',
          name: 'showcase-demo1',
          title: 'Showcase Demo 1 Account',
          description: 'Showcase Account for Demo 1'
        })
      ]));
    });

    it('should not populate the tenancy info when no token set', async () => {
      expect(session.tenants).toEqual([]);

      expect(fetchMock.called(tenantsUri)).toBe(false);

      expect(session.tenants).toEqual([]);
    });

    it('should cancel the expiry timer', async () => {
      await expect(session.authenticateWithToken('testToken')).resolves.toEqual(session);
      expect(clearTimeout).not.toBeCalled();

      session.setOnExpiryWarning(() => {});

      const { expiryWarningRef } = session;
      expect(expiryWarningRef).not.toBe(null);

      await session.authenticateWithToken('newtoken');

      expect(clearTimeout).toBeCalledWith(expiryWarningRef);
      expect(session.expiryWarningRef).not.toEqual(expiryWarningRef);
    });
  });

  describe('populateAccess', () => {
    it('should populate the access session when token present', async () => {
      session.token = '123';
      expect(session.access).toEqual({});
      await expect(session.populateAccess()).resolves.toBeFalsy();

      expect(fetchMock.called(accessUri)).toBe(true);

      expect(session.access.accessToken).toBeDefined();
      expect(session.access.permissions).toBeDefined();
      expect(session.access.tokenType).toEqual('bearer');
    });

    it('should do nothing when token not present', () => {
      expect(session.access).toEqual({});
      expect(session.populateAccess()).resolves.toBeFalsy();
      expect(fetchMock.called(accessUri)).not.toBe(true);

      expect(session.access.accessToken).not.toBeDefined();
      expect(session.access.permissions).not.toBeDefined();
      expect(session.access.tokenType).not.toBeDefined();
    });
  });

  describe('active methods', () => {
    beforeEach(async () => session.authenticateWithToken('testtoken'));

    describe('findTenant', () => {
      it('should return a tenant object from the supplied name', () => {
        expect(session.findTenant('showcase-demo1')).toEqual(expect.objectContaining({
          ref: 'root:showcase-demo1',
          owner: 'root',
          name: 'showcase-demo1',
          title: 'Showcase Demo 1 Account',
          description: 'Showcase Account for Demo 1'
        }));

        expect(session.findTenant('test').name).toEqual('test');
      });

      it('should return undefined when no tenant matches the supplied name', () => {
        expect(session.findTenant()).toBe(undefined);
        expect(session.findTenant(null)).toBe(undefined);
        expect(session.findTenant('nonexistant')).toBe(undefined);
        expect(session.findTenant(42)).toBe(undefined);
      });
    });

    describe('currentTenant', () => {
      it('should return the first tenant if no currentTenant has been set', () => {
        expect(session.currentTenant.name).toEqual('fakeside-transavia');
      });

      it('should return the set tenant if currentTenant has been set', () => {
        session.currentTenant = 'test';
        expect(session.currentTenant).toEqual(expect.objectContaining({
          ref: 'root:test',
          owner: 'root',
          name: 'test',
          tags: ['dataset:static-common', 'dataset:customer-test'],
          createdAt: '2016-05-25T10:03:16.703Z',
          createdBy: 'root:root',
          updatedAt: '2016-09-02T15:45:56.513Z',
          updatedBy: 'root:root',
          version: 'fef32ba1389833d0c80b1e8b17a7c19db59ee8cd',
          title: 'Test',
          description: 'A test account',
          parentRef: 'root:root'
        }));
      });

      it('should return null if the session is inactive', () => {
        session.destroy();
        expect(session.currentTenant).toBe(null);
      });
    });

    describe('currentOwner', () => {
      it('should return the name of the current tenant', () => {
        expect(session.currentOwner()).toEqual('fakeside-transavia');

        session.currentTenant = 'test';
        expect(session.currentOwner()).toEqual('test');
      });
    });
  });

  describe('getIdentityUri', () => {
    beforeEach(() => {
      registry.getServiceLocation = jest.fn();
    });

    it('should pass the url if the url has already been set', () => {
      registry.getServiceLocation.mockReturnValue('https://thisisatestwebsite.com');
      expect(session.getIdentityUri()).resolves.toEqual('https://thisisatestwebsite.com');
    });

    it('should get the url from the registry if the url has not been set before', () => {
      registry.getServiceLocation.mockReturnValue(null);
      expect(session.getIdentityUri()).resolves.toEqual('http://localhost');
    });
  });
});
