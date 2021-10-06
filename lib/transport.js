import urlEncoder from 'encodeurl';
import deepmerge from 'deepmerge';

/**
 * Handles fetching.
 *
 * This class should not be used directly, but should instead be obtained
 * from {@link ServiceDescriptor#resourcefulEndpoint} or {@link ServiceDescriptor#businessEndpoint}
 *
 * @param {TransportDefaults?} options - The options to use with all fetch requests
 * @param {string?} encodeUri - Indicate whether to encode request URIs generated. Defaults `false`
 *
 * @property {TransportDefaults?} defaults - Stored from the initial 'options' parameter merged with the standard defaults
 *
 * @example
 * import Transport from '@pikselpalette/sequoia-js-client-sdk/lib/transport';
 *
 * const transport = new Transport({method: 'POST'});
 * transport.fetchWithDefaults('someurl').then((response) => console.log(response);
 *
 */
class Transport {
  /**
   * @typedef {Object} TransportDefaults
   *
   * Default fetch options to send with all `fetch` requests.
   *
   * @see {@link https://github.github.io/fetch/#options}
   */

  constructor(fetchOptions = {}, encodeUri = false) {
    this.defaults = Object.assign(
      {},
      {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/vnd.piksel+json',
          Accept: 'application/json'
        }
      },
      fetchOptions
    );
    this.encodeUri = encodeUri;
  }

  /**
   * Encodes the request url if `this.encodeUri` is true.
   *
   * @param {string} url - the url to potentially encode
   */
  encodeUrl(url) {
    if (this.encodeUri === true) {
      // use encodeUrl dep as it won't double-encode
      this.encodeUrl = u => urlEncoder(u);
      return urlEncoder(url);
    }
    this.encodeUrl = u => u;
    return url;
  }

  /**
   * Performs a {@link https://github.github.io/fetch/|fetch} with the default options from {@link Transport}
   *
   * @param {string} url - sequoia url
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @returns {Promise}
   */
  fetchWithDefaults(url, options = {}) {
    return fetch(
      this.encodeUrl(url),
      deepmerge(this.defaults, options)
    ).then((response) => {
      if (!response.ok) {
        return response.json().then(
          (responseBody) => {
            const error = new Error(responseBody.message);
            error.response = response;
            throw error;
          },
          () => {
            const error = new Error(response.statusText);
            error.response = response;
            throw error;
          }
        );
      }

      if (response.status === 204) {
        return {};
      }

      return response.json();
    });
  }

  /**
   * Performs an HTTP GET request
   *
   * @param {string} url - sequoia url
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @returns {Promise}
   */
  get(url, options = {}) {
    return this.fetchWithDefaults(url, options);
  }

  /**
   * Performs an HTTP POST request
   *
   * @param {string} url - sequoia url
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @returns {Promise}
   */
  post(url, options = {}) {
    return this.fetchWithDefaults(
      url,
      Object.assign({ method: 'POST' }, options)
    );
  }

  /**
   * Performs an HTTP PUT request
   *
   * @param {string} url - sequoia url
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @returns {Promise}
   */
  put(url, options = {}) {
    return this.fetchWithDefaults(
      url,
      Object.assign({ method: 'PUT' }, options)
    );
  }

  /**
   * Performs an HTTP DELETE request
   *
   * @param {string} url - sequoia url
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @returns {Promise}
   */
  destroy(url, options = {}) {
    return this.fetchWithDefaults(
      url,
      Object.assign({ method: 'DELETE' }, options)
    );
  }
}

export default Transport;
