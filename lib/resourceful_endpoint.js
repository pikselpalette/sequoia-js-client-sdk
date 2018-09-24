import Query from './query';
import ResourceCollection, { NO_NEXT_PAGE_ERROR } from './resource_collection';
import Resource from './resource';

/**
 * ResourceFulEndpoint is the main interaction class against sequoia MDS endpoints.
 * This is what you'll be using to present data to users, for example content items, registered users etc.
 *
 * This class should not be used directly, but should instead be obtained
 * from {@link ServiceDescriptor#resourcefulEndpoint}
 *
 * @param {Transport} transport - Transport instance to use for fetching
 * @param {Object} resourceful - JSON object describing this resourceful endpoint
 * (fetched from sequoia services 'descriptor')
 *
 * @example
 * // `contents` is used in the rest of the examples as our reference
 * // to a ResourcefulEndpoint
 * let contents;
 *
 * client.login('username', 'password').then(session => {
 *   client.service('metadata').then(service => {
 *     // Get a resourceful endpoint (this is synchronous as the service passed
 *     // all the necessary data):
 *     contents = service.resourcefulEndpoint('contents');
 *     // whatever
 *   });
 * });
 *
 * @private
 */
class ResourcefulEndpoint {
  /**
   * @param {Object} resourceful - the Sequoia descriptor part that describes this endpoint
   *
   * @returns {ResourcefulEndpoint}
   */
  constructor(transport, resourceful) {
    this.transport = transport;
    this.resourceful = resourceful;
  }

  get owner() {
    if (this.resourceful) {
      return this.resourceful.tenant;
    }

    return undefined;
  }

  /**
   * Turn the first item in the Sequoia response for this endpoint
   * into a {@link Resource}. This is a convenience for when operating
   * on individual Resources (read, update, store) where the sequoia response
   * is of the form
   * ```
   * {
   *   <pluralName>: [<Resource>],
   *   meta: { ... }
   * }
   * ```
   *
   * and we want to just operate on `Resource`
   *
   * @private
   *
   * @returns {Resource}
   */
  responseToResource(json) {
    const resource = json[this.pluralName][0];
    resource.linked = json.linked;

    return new Resource(resource, this);
  }

  /**
   * Obtain a new {@link Resource} for this endpoint.
   * A *new* resource is something that has not yet been created remotely.
   *
   * The `owner` property will be pre-populated with the current tenancy. Provding a
   * a value for this will override the current tenancy. This is useful when using
   * root tenancy but populating data on behalf of non-root tenancies.
   * See {@link Client#setTenancy} for more information.
   *
   * When a `name` property is provided, the `ref` (unique id) of this resource will
   * also be populated. This is useful for allowing linking different kinds of resources
   * together (see {@link Resource#link}) before saving the resources.
   *
   * There is a potential that `name`s you choose will conflict with already stored resources.
   * In this case, your changes will override the remote resource. See the below example
   * for how to handle these situations.
   *
   * @param {Object} data -data to populate the {@link Resource} with
   * @param {string=} data.owner -Defaults to the current tenancy name
   *
   * @example <caption>Create a new resource</caption>
   *
   * const contentItem = contents.newResource({
   *  name: 'my-new-content',
   *  title: 'something',
   *  synopsis: 'a really long synopsis'
   * });
   *
   * // You can now call methods on it, for example, a usual flow for creating
   * // a Resource would be:
   *
   * contentItem.validate()
   * .then(() => contentItem.save())
   * .then(() => {
   *   // Success, do something (redirect to a new view?)
   * }).catch((error) => {
   *   // Validation error (from Resource object or the server), show the user what went wrong
   * });
   *
   * @example <caption>Update or create a piece of content</caption>
   *
   * const potentiallyNewContentItem = contents.newResource({
   *  name: 'my-potentially-new-content',
   *  title: 'something new',
   *  synopsis: 'a really long synopsis'
   * });
   *
   * function findOrCreateResource(resourceful, data) {
   *   return resourceful.readOne(`${resourceful.owner}:${data.name}`).catch(() => resourceful.newResource(data));
   * }
   *
   * // You can now call methods on it, for example, a usual flow for creating
   * // a Resource would be:
   *
   * findOrCreateResource(contents, potentiallyNewContentItem)
   * .then((contentItem) => {
   *   // Update with new data in case it was an existing resource
   *   Object.assign(contentItem, potentiallyNewContentItem);
   *   contentItem.duration = 'PT75M';
   *
   *   return contentItem.save())
   * .then(() => {
   *   // Success, do something (redirect to a new view?)
   * }).catch((error) => {
   *   // Validation error (from the server), show the user what went wrong
   * });
   *
   * @returns {Resource}
   */
  newResource(data = { owner: this.owner }) {
    data.owner = data.owner || this.owner;

    if (data.ref === undefined && data.owner && data.name) {
      data.ref = `${data.owner}:${data.name}`;
    }

    return new Resource(Object.assign({ is_new: true }, data), this);
  }

  /**
   * Create a new {@link ResourceCollection} for this endpoint.
   *
   * Useful for creating many resources for ingest.
   *
   * @param {Array<Object>} data -data to populate the {@link ResourceCollection} with
   *
   * @example <caption>Create a new resource</caption>
   *
   * const contentItems = contents.newResourceCollection([{
   *  name: 'one',
   *  title: 'something',
   *  synopsis: 'a really long synopsis'
   * },
   * {
   *  name: 'two',
   *  title: 'something else',
   *  synopsis: 'another really long synopsis'
   * }]);
   *
   * contentItems.validate()
   * .then(() => contentItems.save())
   * .then(() => {
   *   // Success, do something (redirect to a new view?)
   * }).catch((error) => {
   *   // Validation error (from a nested Resource object or the server), show the user what went wrong
   * });
   *
   * @returns {ResourceCollection}
   */
  newResourceCollection(data = []) {
    const { pluralName } = this.resourceful;

    let collectionData;

    if (Array.isArray(data)) {
      collectionData = {
        [pluralName]: data
      };
    } else {
      collectionData = data;
      console.warn('Using newResourceCollection with an object is deprecated - pass an array instead');
    }

    return new ResourceCollection(collectionData, '', this);
  }

  /**
   * Perform a browse (a GET for all items on this resourceful endpoint, with
   * optional `criteria`). The collection returned is the first page of results as
   * specified by `perPage` (or the Resourceful default e.g. 100)
   *
   * @param {(string|Query)} criteria - A query string to append to the request
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Trasport#get}
   *
   * @returns {Promise} - A {@link ResourceCollection}
   */
  browse(criteria, options) {
    return this.transport
      .get(this.endPointUrl(null, this.getRelatedThroughFields(criteria)), options)
      .then(json => new ResourceCollection(json, criteria, this));
  }

  /**
   * Private
   * Look through the relationships of a criteria, and include fields from through
   * relationships - this makes it so that the end user shouldn't know or care that
   * through relationships exist.
   *
   * @param {(string|Query)} criteria - A query string to append to the request
   *
   * @returns {(Query)} criteria - A qquery with additional includes if needed

   */
  getRelatedThroughFields(criteria) {
    if (!criteria || !criteria.query) return criteria;
    const query = criteria.query || '';
    const params = query.split('&');
    const includes = params.find(param => param.startsWith('include=') || '')
      .replace('include=', '')
      .split(',');

    let fields = params.find(param => param.startsWith('fields=')) || '';

    if (fields) {
      fields = fields.split(',');
    } else {
      fields = [];
    }

    const filteredIncludes = includes
      .map((include) => {
        const { through } = this.resourceful.relationships[include] || {};

        if (!through) return;

        const throughRelationship = this.resourceful.relationships[through] || {};

        // eslint-disable-next-line consistent-return
        return throughRelationship.fieldNamePath;
      })
      .filter(fieldNamePath => fieldNamePath);

    if (!filteredIncludes.length) {
      return criteria;
    }

    let newQuery = filteredIncludes && criteria.query
      .split('&')
      .map(queryItem => queryItem.startsWith('fields=') ? fields.concat(filteredIncludes).join(',') : queryItem)
      .join('&');

    if (!newQuery.includes('fields=')) {
      newQuery = newQuery.concat('&', `fields=${filteredIncludes.join(',')}`);
    }

    criteria.query = newQuery;

    return criteria;
  }

  /**
   * The same as {@link ResourcefulEndpoint#browse} but will fetch *all* pages as a single
   * {@link ResourceCollection}
   *
   * @param {(string|Query)} criteria - A query string to append to the request
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Transport#get}
   *
   * @returns {Promise} - A {@link ResourceCollection}
   */
  all(criteria, options) {
    let collection = null;
    const { pluralName } = this.resourceful;
    function accumulate(resourceCollection) {
      if (collection === null) {
        collection = Object.assign({}, resourceCollection);
      } else {
        // Things rely on rawData, not the derived collections
        collection.rawData[pluralName] = collection.rawData[pluralName].concat(resourceCollection.rawData[pluralName]);
        if (resourceCollection.rawData.linked) {
          Object.entries(resourceCollection.rawData.linked).forEach(([key, value]) => {
            if (!collection.rawData.linked[key]) collection.rawData.linked[key] = [];
            collection.rawData.linked[key] = collection.rawData.linked[key].concat(value);
          });
        }
      }

      return resourceCollection
        .nextPage()
        .then(c => accumulate(c))
        .catch((err) => {
          if (err === NO_NEXT_PAGE_ERROR) {
            return collection;
          }

          throw err;
        })
        .then(() => collection);
    }

    return (
      this.browse(criteria, options)
        .then(c => accumulate(c))
        // Return a new ResourceCollection to ensure all is ok
        .then(c => new ResourceCollection(c.rawData, c.initialCriteria, c.resourcefulEndpoint))
    );
  }

  /**
   * Fetch (performs an HTTP GET on) an individual item, with optional criteria
   *
   * @param {string} ref - The unique `reference` for this item
   * @param {(string|Query)} criteria - A query string to append to the request
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Transport#get}
   *
   * @returns {Promise} - A {@link Resource}
   */
  readOne(ref, criteria, options) {
    return this.transport.get(this.endPointUrl(ref, criteria), options).then(json => this.responseToResource(json));
  }

  /**
   * Fetch (performs an HTTP GET on) many items, with optional criteria
   *
   * @param {Array<String>} refs - The unique `references` for the items
   * @param {(string|Query)} criteria - A query string to append to the request
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Transport#get}
   *
   * @returns {Promise} - A {@link ResourceCollection}
   */
  readMany(refs, criteria, options) {
    return this.transport.get(this.endPointUrl(refs.join(','), criteria), options).then(json => new ResourceCollection(json, criteria, this));
  }

  /**
   * Store (perform an HTTP POST for) a new item
   *
   * @param {Resource} resource - A {@link Resource} corresponding to the new resource you wish to save
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Transport#post}
   *
   * @todo Validate against the descriptor that this is a valid item to store
   *
   * @returns {Promise}
   */
  store(resource, options) {
    return this.transport
      .post(this.endPointUrl(), Object.assign({ body: resource.serialise() }, options))
      .then(json => this.responseToResource(json));
  }

  /**
   * Update (perform an HTTP PUT for) an existing item
   *
   * @param {Object} resource - An Object corresponding to the new resouce you wish to save
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Transport#put}
   *
   * @todo Validate against the descriptor that this is a valid item to store
   *
   * @returns {Promise}
   */
  update(resource, options) {
    return this.transport
      .put(this.endPointUrl(resource.ref), Object.assign({ body: resource.serialise() }, options))
      .then(json => this.responseToResource(json));
  }

  /**
   * Destroy (perform an HTTP DELETE for) an existing item
   *
   * @param {Object} resource - An Object corresponding to the resouce you wish to delete
   * @param {object} options - [fetch options]{@link https://github.github.io/fetch/#options}
   *
   * @see {@link Transport#destroy}
   *
   * @returns {Promise}
   */
  destroy(resource, options) {
    let { ref } = resource;

    if (typeof resource === 'string') {
      ref = resource;
    }

    return this.transport.destroy(this.endPointUrl(ref), options);
  }

  /**
   * Get the relationship info for `relationshipName` from the descriptor
   *
   * @param {string} relationshipName - The name of the relationship e.g. 'assets'
   *
   * @throws {Error} - Throws when the relationship doesn't exist
   *
   * @example
   *
   * contents.relationshipFor('categories');
   *
   * // Returns:
   *
   * {
   *   "description": "The associated categories",
   *   "type": "direct",
   *   "resourceType": "categories",
   *   "fieldNamePath": "categoryRefs",
   *   "fields": [
   *     "ref",
   *     "title",
   *     "parentRef",
   *     "scheme",
   *     "value"
   *   ],
   *   "name": "categories",
   *   "batchSize": 10
   * }
   *
   * @returns {Object}
   */
  relationshipFor(relationshipName) {
    const [name] = Object.entries(this.relationships).find(([, relationship]) => relationship.resourceType === relationshipName) || [undefined];

    if (name) {
      return this.relationships[name];
    }

    throw new Error(`Relationship '${relationshipName}' does not exist`);
  }

  /**
   * Get the relationship info from the descriptor.
   *
   * @example
   *
   * contents.relationships
   *
   * // Returns:
   *
   * {
   *   "children": {
   *     "description": "The associated child contents",
   *     "type": "indirect",
   *     "resourceType": "contents",
   *     "filterName": "withParentRef",
   *     "fields": [
   *       "ref",
   *       "title",
   *       "parentRef",
   *       "type"
   *     ],
   *     "batchSize": 10,
   *     "name": "children"
   *   },
   *   "assets": {
   *     "description": "The associated assets",
   *     "type": "indirect",
   *     "resourceType": "assets",
   *     "filterName": "withContentRef",
   *     "fields": [
   *       "ref",
   *       "name",
   *       "contentRef",
   *       "type",
   *       "url",
   *       "fileFormat",
   *       "title",
   *       "fileSize",
   *       "tags"
   *     ],
   *     "batchSize": 10,
   *     "name": "assets"
   *   }
   * }
   *
   * @type {object}
   */
  get relationships() {
    return this.resourceful.relationships;
  }

  /**
   * Get the `pluralName` from the descriptor. The plural name is used to identify
   * the content array from the JSON response from Sequoia. e.g. for `assets`, the
   * response will be of the form:
   *
   * ```json
   * {
   *   assets: [ asset resource, asset resource ... ],
   *   linked: [ linked resource, linked resource ... ],
   *   meta: { ...meta info }
   * }
   * ```

   * @type {string}
   */
  get pluralName() {
    return this.resourceful.pluralName;
  }

  /**
   * Get the `singularName` from the descriptor. The singular name is used to identify
   * what the specific resourceful resource is identified as.
   *
   * @type {string}
   */
  get singularName() {
    return this.resourceful.singularName;
  }

  /**
   * Get the `hyphenatedPluralName` from the descriptor. The hyphenated plural name
   * is used to identify what the resourceful endpoint is called. e.g. a camelCased
   * resource (`pluralName`) like `contentSegments` will live under an HTTP endpoint
   * of `content-segments`
   *
   * @type {string}
   */
  get hyphenatedPluralName() {
    return this.resourceful.hyphenatedPluralName;
  }

  /**
   * Get the `serviceName` from the descriptor.
   *
   * @type {string}
   */
  get serviceName() {
    return this.resourceful.serviceName;
  }

  /**
   * Get the `batchSize` from the descriptor's `storeBatch` operation.
   * This is how many resources can be saved at once when saving a {@link ResourceCollection}
   *
   * @type {number}
   */
  get batchSize() {
    const defaultBatchSize = 100;
    const { operations } = this.resourceful;

    if (operations && operations.storeBatch) {
      return operations.storeBatch.limit || defaultBatchSize;
    }

    return defaultBatchSize;
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
   * @returns {string}
   */
  criteriaToQuery(criteria) {
    let query = `?owner=${this.owner}`;

    if (typeof criteria === 'string') {
      if (criteria !== '') {
        query += `&${criteria}`;
      }
    } else if (criteria instanceof Query) {
      query += `&${criteria.toQueryString()}`;
    }

    return query;
  }

  /**
   * Get the full URL to the resourceful endpoint/item we will send the request to
   *
   * @param {string?} ref - An optional unique ref for performing actions on a unique item (rather than browsing)
   * @param {(string|Query)?} criteria - A (potential) query string to append to the request
   *
   * @see {@link ResourcefulEndpoint#criteriaToQuery}
   *
   * @private
   *
   * @returns {string}
   */
  endPointUrl(ref, criteria) {
    let resourceRef = '';

    if (ref) {
      resourceRef = `/${ref}`;
    }

    return `${this.resourceful.location}/${this.resourceful.hyphenatedPluralName}${resourceRef}${this.criteriaToQuery(criteria)}`;
  }
}

export default ResourcefulEndpoint;
