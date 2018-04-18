import queryString from 'query-string';
import Query from './query';

export function InvalidCriteriaException(message) {
  this.message = message;
  this.name = 'InvalidCriteriaException';
}

/**
 * BusinessEndpoint is the main interaction class against non-resourceful sequoia endpoints.
 *
 * Business endpoints are simple rest-like endpoints. Due to the nature of them, this SDK
 * is not (currently) intending to provide anything other than simple validation for
 * paths and query strings. Objects are just the plain JSON returned from the service,
 * unlike {@link ResourcefulEndpoint} which will send back {@link ResourceCollection} and
 * {@link Resource}s.
 *
 * See {@link https://productdocs.piksel.com/components/foundations/registry/#business-endpoints} and
 * {@link https://productdocs.piksel.com/components/foundations/gateway/#business-endpoint} for more information.
 *
 * This class should not be used directly, but should instead be obtained
 * from {@link Service#businessEndpoint}
 *
 * @param {Transport} transport - Transport instance to use for fetching
 * @param {Object} business - JSON object describing this business endpoint
 * (fetched from sequoia services 'descriptor')
 *
 * @example
 * // `contents` is used in the rest of the examples as our reference
 * // to a ResourcefulEndpoint
 * let feeds;
 *
 * client.generate().then(() => {
 *   client.service('gateway').then((service) => {
 *     // Get a business endpoint (this is synchronous as the service passed
 *     // all the necessary data):
 *     feeds = service.businessEndpoint('feeds', { name: 'UTV-15246' });
 *     // whatever
 *   });
 * });
 *
 * @private
 */
class BusinessEndpoint {
  constructor(transport, endpoint, pathOptions) {
    this.transport = transport;
    this.endpoint = endpoint;

    let { path } = endpoint;
    const errors = [];
    const pathParams = Object.assign({ owner: endpoint.tenant }, pathOptions);

    (path.match(/([^{]*?).(?=\})/gmi) || []).forEach((pathParam) => {
      if (!(pathParam in pathParams) && !pathParam.endsWith('?')) {
        errors.push(`Required path parameter '${pathParam}' was not supplied`);
      }
    });

    if (errors.length) {
      throw new Error(errors.join('\n'));
    }

    Object.keys(pathParams).forEach((key) => {
      path = path.replace(new RegExp(`{${key}[?]?}`), pathParams[key]);
    });

    // Strip out any optional params:
    path = path.replace(/{[^?]+\?}/g, '');
    this.endpoint.location = `${this.endpoint.location}${path}`;
  }

  /**
   * Perform an action against the business endpoint. Note, the HTTP method comes from
   * the `routes['name'].method` portion of the descriptor
   *
   * @param {(string|Query)} criteria - A query string to append to the request
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Transport#fetchWithDefaults}
   *
   * @throws InvalidCriteriaException
   *
   * @returns {Promise} - JSON returned from the endpoint
   */
  fetch(criteria, options) {
    const { method } = this.endpoint;
    const fetchOptions = Object.assign({ method }, options);

    return this.transport.fetchWithDefaults(this.endPointUrl(criteria), fetchOptions);
  }

  /**
   * Required query parameters for the business endpoint from the
   * `routes['name'].inputs.query` portion of the descriptor
   *
   * Returns the raw objects
   *
   * @example
   * // Returns e.g.
   * [{
   *   "type": "name",
   *   "meta": [{
   *     "sequoiaType": "name"
   *     }],
   *   "invalids": ["" ],
   *   "name": "count",
   *   "required": false
   *  },
   *  {
   *    "type": "string",
   *    "description": "language to localise response to",
   *    "invalids": [""],
   *    "name": "lang",
   *    "required": false
   *  }]
   *
   * @type {object[]}
   */
  get requiredQueryParameters() {
    const { inputs } = this.endpoint;

    if (inputs && inputs.query) {
      return inputs.query.filter(query => query.required === true);
    }

    return [];
  }

  /**
   * Returns an array of query parameter names
   *
   * @example
   * // Returns e.g.
   * ['currency', 'price']
   *
   * @type {string[]}
   */
  get requiredQueryParameterNames() {
    return this.requiredQueryParameters.map(q => q.name);
  }

  // Private methods

  /**
   * Return a query string to append to the HTTP call. Will default to appending
   * `?owner=<owner>`
   *
   * @param {(string|Query)?} criteria - A (potential) query string to append to the request
   *
   * @private
   *
   * @throws InvalidCriteriaException
   *
   * @returns {string}
   */
  criteriaToQuery(criteria) {
    let query = '';

    if (typeof criteria === 'string') {
      if (criteria !== '') {
        query += `?${criteria}`;
      }
    } else if (criteria instanceof Query) {
      query += `?${criteria.toQueryString()}`;
    }

    const requestQueryParams = Object.keys(queryString.parse(query));

    this.requiredQueryParameterNames.forEach((requiredValue) => {
      if (!requestQueryParams.includes(requiredValue)) {
        throw new InvalidCriteriaException(`Required query parameter '${requiredValue}' was not passed`);
      }
    });

    return query;
  }

  /**
   * Get the full URL to the business endpoint/item we will send the request to
   *
   * @param {(string|Query)?} criteria - A (potential) query string to append to the request
   *
   * @see {@link BusinessEndpoint#criteriaToQuery}
   *
   * @private
   *
   * @throws InvalidCriteriaException
   *
   * @returns {string}
   */
  endPointUrl(criteria) {
    return `${this.endpoint.location}${this.criteriaToQuery(criteria)}`;
  }
}

export default BusinessEndpoint;
