import Resource from './resource';

export const NO_RESOURCEFUL_ENDPOINT_ERROR = `
No resourceful endpoint tied to this resource collection.
You should use resourcefulEndpoint.browse(),
or supply a ResourcefulEndpoint instance when creating this collection.
`;

export const NO_NEXT_PAGE_ERROR = 'No next page';
export const NO_PREVIOUS_PAGE_ERROR = 'No previous page';

/**
 * A pagination aware collection of {@link Resource} objects.
 *
 * This class should not be used directly, but should instead be obtained
 * from {@link ResourcefulEndpoint} methods
 *
 * @param {Object} rawData - Raw JSON response from the Sequoia endpoint
 * @param {string} initialCriteria - the initial filter criteria used when requesting from this endpoint
 * @param {ResourcefulEndpoint} resourcefulEndpoint - The {@link ResourcefulEdnpoint} that created this ResourceCollection
 *
 * @property {Object} rawData - Raw JSON response from the Sequoia endpoint
 * @property {string} initialCriteria - the initial filter criteria used when requesting from this endpoint
 * @property {ResourcefulEndpoint} resourcefulEndpoint - The {@link ResourcefulEdnpoint} that created this ResourceCollection
 * @property {Resource[]} collection - Array of {@link Resource} objects
 *
 * @since 0.0.2
 *
 * @private
 */
class ResourceCollection {
  /**
   * @param {Object} rawData - Raw JSON response from the Sequoia endpoint
   * @param {string} initialCriteria - the initial filter criteria used when requesting from this endpoint
   * @param {ResourcefulEndpoint} resourcefulEndpoint - The {@link ResourcefulEndpoint} that created this ResourceCollection
   *
   * @returns {Resource}
   */
  constructor(rawData, initialCriteria, resourcefulEndpoint) {
    /** @property {string} - the initial filter criteria used when requesting from this endpoint */
    this.initialCriteria = initialCriteria;
    /** @property {ResourcefulEndpoint} - The {@link ResourcefulEndpoint} that created this ResourceCollection */
    this.resourcefulEndpoint = resourcefulEndpoint;
    /** @property {Resource[]} - Array of {@link Resource} objects */
    this.collection = [];

    this.setData(rawData);
  }

  /**
   * Updates `rawData` with the json returned from the Sequoia service and sets
   * `collection` to an array of `{@link Resource}s
   *
   * Linked resources are collated into the individual {@link Resource}s created
   * for each item in the collection if they have relationship info. e.g.
   * Assets that are linked to Contents will have a `contentRef` - if this is present,
   * each Content instance will have a linked.assets[] with only the related Assets
   *
   * If there is no relationship specified in linked resources, (e.g. linked Customers
   * against Subscriptions from the Payment service) then each Subscription instance
   * will have *all* of the Customers avaliable as linked.customers[]
   *
   * @param {Object} rawData - json from a Sequoia `browse` request
   *
   * @private
   *
   * @returns {ResourceCollection} - self
   */
  setData(rawData) {
    this.rawData = rawData;
    // Without a descriptor, we don't know truly know what to pick out
    if (this.resourcefulEndpoint && this.rawData && this.rawData[this.resourcefulEndpoint.pluralName]) {
      this.collection = this.rawData[this.resourcefulEndpoint.pluralName].map((content) => {
        const resource = Object.assign({}, content); // Copy
        if (this.rawData.linked) {
          const linkByRefName = `${this.resourcefulEndpoint.singularName}Ref`;
          resource.linked = {};

          Object.keys(this.rawData.linked).forEach((link) => {
            resource.linked[link] = this.rawData.linked[link].filter((item) => {
              // If a `linkByRefName` exists on this link, filter only those
              // that are directly linked (this helps when `browsing()` a list of
              // disparate content where links come back for every item in the list
              // (e.g. metadata/contents -> linked assets).

              // However, some resourcefuls have links without this explicitly set
              // e.g. relationships like credits/relatedMaterials.assets that have
              // a through, or payment/subscriptions -> linked customers
              if (item[linkByRefName]) {
                return item[linkByRefName] === resource.ref;
              }

              const relationship = (this.resourcefulEndpoint
                && this.resourcefulEndpoint.resourceful
                && this.resourcefulEndpoint.resourceful.relationships
                && this.resourcefulEndpoint.resourceful.relationships[link]) || {};

              const { through, filterName } = relationship;
              // if we do not have a through, we are handling payment/customers
              // and we don't want to filter anything out
              if (!through) return true;

              const { fieldNamePath } = this.resourcefulEndpoint.resourceful.relationships[through];
              const throughFields = resource[fieldNamePath] || [];
              const filteredFieldNamePath = this.resourcefulEndpoint.resourceful.filters
                && this.resourcefulEndpoint.resourceful.filters[filterName]
                && this.resourcefulEndpoint.resourceful.filters[filterName].fieldNamePath;

              return throughFields.some(field => field === item[filteredFieldNamePath]);
            });
          });
        }

        return new Resource(resource, this.resourcefulEndpoint);
      });
    }

    return this;
  }

  /**
   * Current page in the pagination set
   * @type {number}
   */
  get page() {
    return this.rawData.meta.page;
  }

  /**
   * Number of items per page in the pagination set
   * @type {number}
   */
  get perPage() {
    return this.rawData.meta.perPage;
  }

  /**
   * Total number of Resources in the catalogue matching our criteria
   * @type {number}
   */
  get totalCount() {
    if (this.rawData && this.rawData.meta && this.rawData.meta.totalCount) {
      return this.rawData.meta.totalCount;
    }

    return this.collection.length;
  }

  /**
   * Fetch the next page of results
   *
   * @see {@link ResourceCollection#fetch}
   *
   * @returns {Promise}
   */
  nextPage() {
    if (this.rawData.meta.next) {
      return this.fetch(this.rawData.meta.next);
    }

    return Promise.reject(NO_NEXT_PAGE_ERROR);
  }

  /**
   * Fetch the previous page of results
   *
   * @see {@link ResourceCollection#fetch}
   *
   * @returns {Promise}
   */
  previousPage() {
    if (this.rawData.meta.prev) {
      return this.fetch(this.rawData.meta.prev);
    }

    return Promise.reject(NO_PREVIOUS_PAGE_ERROR);
  }

  /**
   * Fetch the first page of results
   *
   * @see {@link ResourceCollection#fetch}
   *
   * @returns {Promise}
   */
  firstPage() {
    return this.fetch(this.rawData.meta.first);
  }

  /**
   * Fetch the last page of results
   *
   * @see {@link ResourceCollection#fetch}
   *
   * @returns {Promise}
   */
  lastPage() {
    return this.fetch(this.rawData.meta.last);
  }

  /**
   * Fetch a specific page of results
   *
   * @param {number} pageNumber - the number of the page to fetch
   *
   * @todo Boundary checking?
   * @todo This could likely be easier to use with the initialCriteria
   *
   * @see {@link ResourceCollection#fetch}
   *
   * @returns {Promise}
   */
  getPage(pageNumber) {
    return this.fetch(this.rawData.meta.first.replace(/&page=\d+/, `&page=${pageNumber}`));
  }

  /**
   * Update the collection with new data from the server. This will
   * also return the new ResourceCollection as a convenience.
   *
   * @param {string?} newCriteria - query string criteria to send to {@link ResourcefulEndpoint#browse}
   *
   * @private
   *
   * @returns {Promise} - The new {@link ResourceCollection} just fetched
   */
  fetch(newCriteria) {
    let criteria = this.initialCriteria || '';

    if (newCriteria) {
      criteria = newCriteria;
    }

    // Remove everything before the query string (meta.first etc all have the full path
    // before the quesy string, which we don't want) and the owner param as the ResourcefulEndpoint
    // will add that
    criteria = criteria.replace(/^.+\?/, '').replace(/&?owner=[^&]+/, '');

    if (this.resourcefulEndpoint) {
      return this.resourcefulEndpoint.browse(criteria).then((newResource) => {
        this.rawData = newResource.rawData;
        this.collection = newResource.collection;

        return newResource;
      });
    }

    return Promise.reject(NO_RESOURCEFUL_ENDPOINT_ERROR);
  }

  /**
   * Get a JSON representation of this collection's keys/values
   *
   * @returns {Object}
   */
  toJSON() {
    return this.collection.map(resource => resource.toJSON());
  }

  /**
   * Get a stringified version of this {@link ResourceCollection} that is suitable
   * for saving to sequoia.
   *
   * Simply wraps the JSON of the resource collection as an array in the <pluralName>[] property
   *
   * @returns {string}
   */
  serialise() {
    return JSON.stringify({
      [this.resourcefulEndpoint.pluralName]: this.toJSON()
    }, null, '  ');
  }

  /**
   * Get an array of ResourceCollections populated with a maximum of the `size`
   * paramater {@link Resource}s in each.
   *
   * Sequoia has limits to how many Resources can be saved at once. This method is used
   * internally by {@link ResourceCollection#save} and {@link ResourceCollection#destroy}
   * to send the right amount of data.
   *
   * @param {number} [size={@link ResourcefulEndpoint#batchSize}] - The number of {@link Resource}s to return in each ResourceCollection
   *
   * @see {@link ResourcefulEndpoint#all}
   *
   * @returns {ResourceCollection[]}
   */
  explode(size) {
    const batchSize = size !== undefined ? size : this.resourcefulEndpoint.batchSize;
    const numberOfPages = Math.ceil(this.totalCount / batchSize);

    return Array.from(
      new Array(numberOfPages),
      (x, i) => this.resourcefulEndpoint.newResourceCollection(this.collection.slice(
        i * batchSize,
        (i * batchSize) + batchSize
      ).map(r => r.toJSON()))
    );
  }

  /**
   * Save (create or update) (POST/PUT) all the {@link Resource}s in this
   * ResourceCollection.
   * If the ResourceCollection has more items than the batchSize specified in the
   * descriptor (or supplied batchSize), multiple calls will be made to the backend
   *
   * @param {number} [size={@link ResourcefulEndpoint#batchSize}] - The number of {@link Resource}s to save in each request
   *
   * @see {@link ResourceCollection#explode}
   * @see {@link ResourcefulEndpoint#store}
   *
   * @returns {Promise}
   */
  save(batchSize) {
    if (this.resourcefulEndpoint) {
      return Promise.all(this.explode(batchSize).map(c => this.resourcefulEndpoint.store(c)
        .catch((e) => {
          // Add the current collection to the error to allow
          // end users to inspect where the error occurred
          e.collection = c;
          throw e;
        })));
    }

    return Promise.reject(NO_RESOURCEFUL_ENDPOINT_ERROR);
  }

  /**
   * Validate all the {@link Resource}s in this collection.
   *
   * @example
   * resourceCollection.validate().catch((resource) => {
   *   // Show resource.errors[]
   * }).then(resourceCollection => resourceCollection.save())
   * .then(() => {
   *   // do something on successfully saving
   * });
   *
   *
   * @see {@link Resource#validateField}
   *
   * @returns {Promise}
   */
  validate() {
    return Promise.all(this.collection.map(resource => resource.validate())).then(() => this);
  }

  /**
   * Destroy (DELETE) all the {@link Resource}s in this ResourceCollection.
   * If the ResourceCollection has more items than the batchSize specified in the
   * descriptor, multiple calls will be made to the backend
   *
   * @example <caption>Destroy all content that went out of availability this year</caption>
   * contents.all(where(field("availabilityEndAt").lessThan("2017"))).then(resources => resources.destroy());
   *
   * @see {@link ResourceCollection#explode}
   * @see {@link ResourcefulEndpoint#destroy}
   *
   * @returns {Promise}
   */
  destroy() {
    if (this.resourcefulEndpoint) {
      return Promise.all(this.explode().map(c => this.resourcefulEndpoint.destroy(c.collection.map(r => r.ref).join(','))));
    }

    return Promise.reject(NO_RESOURCEFUL_ENDPOINT_ERROR);
  }

  // Pragma Local collection methods
  /**
   * Add a {@link Resource} to the [local collection]{@link ResourceCollection#collection}
   * Note: this method does not implement any uniqueness constraints on the `ref`s of
   * objects/Resources being added. If this is required, use {@link ResourceCollection#findOrCreate}
   *
   * @param {Object|Resource} data - Can be either an existing Resource or a JSON object
   * to create a new Resource from
   *
   * @see {@link ResourcefulEndpoint#newResource}
   *
   * @returns {!Resource}
   */
  add(data) {
    let resource = data;

    if (!(data instanceof Resource)) {
      resource = this.resourcefulEndpoint.newResource(data);
    }

    this.collection.push(resource);

    return resource;
  }

  /**
   * Remove a {@link Resource} from the [local collection]{@link ResourceCollection#collection}
   * Will return the found {@link Resource} or null if it does not exist
   *
   * @param {string} ref - the ref of the resource to remove
   *
   * @returns {?Resource}
   */
  remove(ref) {
    const index = this.collection.findIndex(r => r.ref === ref);

    if (index === -1) {
      return null;
    }

    const [resource] = this.collection.splice(index, 1);
    return resource;
  }

  /**
   * Returns a {@link Resource} if it exists in the [local collection]{@link ResourceCollection#collection}
   * with the supplied `ref`
   *
   * @param {string} ref - The ref of the resource to find
   *
   * @returns {?Resource}
   */
  find(ref) {
    return this.collection.find(r => r.ref === ref);
  }

  /**
   * Find a resource in the [local collection]{@link ResourceCollection#collection} or create (and add
   * to the local collection) a Resource from the supplied object
   *
   * @param {Resource|Object} - the resource to find or create
   *
   * @returns {!Resource}
   */
  findOrCreate(resource) {
    const existingResource = this.findWhere(resource instanceof Resource ? resource.toJSON() : resource);

    if (existingResource) {
      return existingResource;
    }

    return this.add(resource);
  }

  /**
   * Filter on `ref` when a string is supplied.
   * Filter by a custom function by supplying a `function`
   * Or filter by key/value pairs in an Object
   * @typedef {(string|function|Object)} Criteria
   */
  /**
   * Find a Resource in the [local collection]{@link ResourceCollection#collection} or `null` if not found
   * The below examples assume the variable contents is populated with the
   * result of `client.service('metadata').then(s => s.resourcefulEndpoint('contents').all())`
   *
   * @param {Criteria} - The criteria to use for filtering the local collection
   *
   * @example <caption>Find all with a custom filter function</caption>
   * // Find all of the Resources that have a title including 'die hard' that haven't had any tags applied yet
   * contents.where(r => r.title.toLowerCase().includes('die hard') && !Array.isArray(r.tags))
   *
   * @example <caption>Find all that match a given object</caption>
   * // Find all of the Resources that are active and have a type of 'show'
   * contents.where({ type: 'show', active: true })
   *
   * @see {@link ResourceCollection#where}
   *
   * @returns {Resource[]}
   */
  where(criteria) {
    let callback;

    if (typeof criteria === 'function') {
      callback = criteria;
    } else if (typeof criteria === 'object' && criteria !== null) {
      // Short circuit when we have a ref:
      if (criteria.hasOwnProperty('ref') && criteria.ref !== undefined) {
        callback = r => r.ref === criteria.ref;
      } else {
        callback = r => Object.keys(criteria).reduce((acc, key) => {
          if (acc === true) {
            return r[key] === criteria[key];
          }

          return false;
        }, true);
      }
    } else {
      return [];
    }

    return this.collection.filter(callback);
  }

  /**
   * Find a Resource in the [local collection]{@link ResourceCollection#collection} or `null` if not found
   *
   * @param {Criteria} - See {@link ResourceCollection#where}
   *
   * @see {@link ResourceCollection#where}
   *
   * @returns {?Resource}
   */
  findWhere(criteria) {
    const resources = this.where(criteria);

    if (resources.length) {
      return resources[0];
    }

    return null;
  }
}

export default ResourceCollection;
