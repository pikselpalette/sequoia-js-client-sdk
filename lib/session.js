export const NO_OAUTH_SECRET_PROVIDED = `
No oAuth client secret was provided.
Provide a base64 secret to allow oAuth logins.
`;

/**
 * Manages the end user authentication session against (currently) pauth token.
 *
 * <p>This class is not intended to be used directly. You should instead use {@link Client#login},
 * {@link Client#logout} and [Client's session property]{@link Client}</p>
 *
 * <p>See the {@link https://identity-reference.sequoia.piksel.com/docs|Sequoia Documentation} for more information.</p>
 *
 * @param {Transport} transport - Transport instance to use for fetching
 * @param {string} directory - The directory (sometimes refered to as 'domain') that the user belongs to.
 * This is prepended to the username on login requests (POSTs to /pauth/token)
 * @param {Registry} registry - a stored registry reference to query
 * @param {string?} identityUri - The endpoint URI for the sequoia identity service e.g. https://identity-sandbox.sequoia.piksel.com
 *
 * @property {string} directory - Stored from the initial `directory` parameter
 * @property {string?} identityUri - Stored from the initial `identityUri` parameter
 * @property {string?} token - The access_token returned from the call to
 * {@link https://identity-reference.sequoia.piksel.com/docs/routes/pauth-token|/pauth/token} after logging in
 * @property {Object[]} tenants - Stored array of tenants the user has access to
 * See the {@link https://identity-reference.sequoia.piksel.com/docs/routes/pauth-tenants|tenants documentation} for more information.
 * @property {Object} access - Stored access information for the logged in user.
 * See the {@link https://identity-reference.sequoia.piksel.com/docs/routes/pauth-access|access documentation} for more information.
 *
 * @example
 * import Session from '@pikselpalette/sequoia-js-client-sdk/lib/session';
 *
 * const session = new Session('piksel', 'https://identity-sandbox.sequoia.piksel.com');
 * session.authenticateWithCredentials('username', 'password').then((session) => this.registry.fetch(session.currentOwner())).then(() => this.session)
 *
 */
class Session {
  constructor(transport, directory, registry, identityUri) {
    this.transport = transport;
    this.directory = directory;
    this.registry = registry;
    this.identityUri = identityUri;
    this.token = null;
    this.tenants = [];
    this.access = {};
    this.currentTenantName = null;
    this.token = null;
  }

  getIdentityUri() {
    const identityUri = this.registry.getServiceLocation('identity');

    if (identityUri !== null) {
      this.identityUri = identityUri;
    }

    // We either had the identityUri supplied via the `client` constructor
    // or we had a pre-populated registry, so return it
    if (this.identityUri) {
      return Promise.resolve(this.identityUri);
    }

    // We don't know about the location of identity, so ask the registry
    const tenancy = this.currentTenant ? this.currentTenant.name : this.directory;

    return this.registry.fetch(tenancy).then(() => {
      this.identityUri = this.registry.getServiceLocation('identity');
    });
  }

  /**
   * @typedef {Object} AuthenticationOptions
   * @property {string?} strategy - 'pauth' or 'oauth'
   * @property {string?} secret - [base64 clientId and clientSecret]{@link https://identity-euw1shared.sequoia.piksel.com/docs/groups/oauth}
   * @property {string?} url - Override the URL to hit for authentication. Useful
   * for providing custom endpoints to provide an access_token
   */

  /**
   * Create a session based on end user credentials
   *
   * @param {string?} username
   * @param {string?} password
   * @param {AuthenticationOptions?} options
   *
   * @see {Client#login}
   * @returns {Promise}
   */
  authenticateWithCredentials(username, password, options = { strategy: 'pauth' }) {
    return this.getIdentityUri().then(() => {
      const { strategy, url, secret } = options;
      let endpoint = `${this.identityUri}/pauth/token`;
      let body = JSON.stringify({ username: `${this.directory}\\${username}`, password });
      let headers;

      if (strategy === 'oauth') {
        if (secret === undefined) {
          return Promise.reject(NO_OAUTH_SECRET_PROVIDED);
        }

        endpoint = `${this.identityUri}/oauth/token`;

        if (typeof username === 'string' && typeof password === 'string') {
          body = `grant_type=password&username=${this.directory}\\${username}&password=${encodeURIComponent(password)}`;
        } else {
          body = 'grant_type=client_credentials';
        }

        headers = {
          authorization: `Basic ${secret}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        };
      }

      // The `url` option overrides
      if (url) {
        endpoint = url;
      }

      delete options.url;
      delete options.strategy;
      delete options.secret;

      const fetchOptions = { body };

      // Just { body, headers } leaves options.headers as undefined and therefor
      // overrides the defaults in transport.js
      if (headers) {
        fetchOptions.headers = headers;
      }
      return this.transport.post(endpoint, Object.assign({}, fetchOptions, options))
      // eslint-disable-next-line camelcase
        .then(({ access_token }) => this.authenticateWithToken(access_token)).then(() => this);
    });
  }

  /**
   * Create a session based on an existing bearer token
   *
   * Use this if you acquire an access token via other means,
   * i.e. an existing oauth mechanism for Sequoia
   *
   * @param {string} token
   *
   * @returns {Promise}
   */
  authenticateWithToken(token) {
    if (token) {
      this.token = token;
      this.transport.defaults.headers.authorization = `Bearer ${this.token}`;
    }
    return this.populateTenants().then(() => this.populateAccess()).then(() => this);
  }

  /**
   * Populate the `tenants` properties of `Session` with
   * data returned from Sequoia.
   *
   * @private
   *
   * @returns {Promise}
   */
  populateTenants() {
    if (this.token === null) {
      // Not authenticated, so do nothing
      return Promise.resolve();
    }

    return this.getIdentityUri().then(() => this.transport.get(`${this.identityUri}/pauth/tenants`)).then((json) => {
      this.tenants = json.tenants;
    });
  }

  /**
   * Populate the `access` properties of `Session` with
   * data returned from Sequoia.
   *
   * @private
   *
   * @returns {Promise}
   */
  populateAccess() {
    if (this.token === null) {
      // Not authenticated, so do nothing
      return Promise.resolve();
    }

    return this.getIdentityUri().then(() => {
      let accessUri = `${this.identityUri}/pauth/access`;

      if (this.currentOwner()) {
        accessUri = `${accessUri}?tenants=${this.currentOwner()}`;
      }

      return this.transport.get(accessUri);
    }).then((json) => {
      this.access = json;
    });
  }

  /**
   * Returns whether there is a currently active logged in session
   *
   * @returns {boolean}
   */
  isActive() {
    return this.token !== null;
  }

  /**
   * Find a tenant by name in the current set of user available tenants
   *
   * @returns {Object}
   */
  findTenant(tenantName) {
    return this.tenants.find(item => item.name === tenantName);
  }

  /**
   * The current tenant being used in this session.
   *
   * When getting this propery, it will default to the first tenant in the {@link Session.tenants} array
   * if this property has not been explicitly set
   *
   * Will return null if there are no tenants available (e.g. the session is inactive)
   * @type {string?}
   */
  get currentTenant() {
    if (!this.tenants.length) {
      return null;
    }

    return this.currentTenantName === null ? this.tenants[0] : this.findTenant(this.currentTenantName);
  }

  set currentTenant(tenantName) {
    this.currentTenantName = tenantName;
  }

  /**
   * Get the name (owner) of the current tenant
   *
   * @returns {string}
   */
  currentOwner() {
    return this.currentTenant ? this.currentTenant.name : this.currentTenantName;
  }

  /**
   * Log out an end user
   *
   * @todo Should this make a call to some service to revoke the auth token?
   *
   * @returns {Session}
   */
  destroy() {
    this.token = null;
    this.tenants = [];
    this.access = {};
    this.currentTenantName = null;

    delete this.transport.defaults.headers.Authorization;

    return this;
  }
}

export default Session;
