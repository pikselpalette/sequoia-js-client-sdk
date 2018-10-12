export const NO_RESOURCEFUL_ENDPOINT_ERROR = `
No resourceful endpoint tied to this resource.
You should use resourcefulEndpoint.newResource(),
or store this current resource with resourcefulEndpoint.store(resource).
`;

function isIterable(obj) {
  /* istanbul ignore next */
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

/**
 * Validation error values
 * @readonly
 * @enum {number}
 */
const ValidationError = {
  /** No validation error */
  NONE: 0,
  /** The field to validate does not exist in the descriptor */
  NO_FIELD: 1,
  /** A required field was omitted */
  REQUIRED_FIELD: 2,
  /** A value didn't match the restricted values for this field */
  NOT_ALLOWED: 3,
  /** The value doesn't match the pattern allowed */
  INVALID_VALUE: 4,
  /** The Map value doesn't match the pattern allowed for either its keys or values */
  INVALID_MAP: 5
};

export { ValidationError };

/**
 * This class should not be used directly, but should instead be obtained
 * from {@link ResourcefulEndpoint} methods
 *
 * @example
 * const service = await client.service('metadata');
 * const contents = service.resourcefulEndpoint('contents');
 *
 * // Get an existing resource:
 * const content = await contents.readOne('some:ref');
 *
 * // Create a new Resource in metadata/contents:
 * const newContent = contents.newResource({
 *  title: 'something',
 *  synopsis: 'a really long synopsis'
 * });
 *
 * // `service`, `content` and `newContent` are used throughtout the rest of the examples
 *
 * @private
 */
class Resource {
  /**
   * @param {Object} rawData - the raw json response from Sequoia
   * @param {ResourcefulEndpoint} resourcefulEndpoint - the {@link ResourcefulEndpoint}
   * that this Resource is a member of
   *
   * @returns {Resource}
   */
  constructor(rawData, resourcefulEndpoint) {
    this.rawData = rawData;
    this.resourcefulEndpoint = resourcefulEndpoint;

    Object.assign(this, rawData);

    this.indirectlyLinkedResources = [];
    this.errors = [];
  }

  /**
   * Get a JSON representation of this Resources's keys/values
   *
   * If this Resource is tied to a {@link ResourcefulEndpoint} it will take the
   * keys and default values from the endpoint's descriptor. Otherwise it will
   * return which ever keys/values have been populated.
   *
   * @returns {Object}
   */
  toJSON() {
    let json = null;

    if (this.getResourceFields()) {
      json = {};

      Object.keys(this.getResourceFields()).forEach((key) => {
        json[key] = this.hasOwnProperty(key)
          ? this[key]
          : this.getResourceFields()[key].default;
      });
    } else {
      json = this.rawData;
    }

    return json;
  }

  /**
   * Get a stringified version of this {@link Resource} that is suitable
   * for saving to sequoia.
   *
   * Simply wraps the JSON of the resource as an array in the <pluralName>[] property
   *
   * @example
   *
   * const resource = new Resource({
   *   ref: 'test:testcontent',
   *   name: 'testcontent',
   *   title: 'A test resource'
   * }, contents);
   *
   * resource.serialise();
   *
   * // Returns:
   * '{"contents":[{"ref":"test:testcontent","name":"testcontent","title":"A test resource"}]}'
   *
   * @returns {string}
   */
  serialise() {
    return JSON.stringify(
      {
        [this.resourcefulEndpoint.pluralName]: [this.toJSON()]
      },
      null,
      '  '
    );
  }

  getResourceFields() {
    if (this.resourcefulEndpoint && this.resourcefulEndpoint.resourceful) {
      return this.resourcefulEndpoint.resourceful.fields;
    }

    return null;
  }

  /**
   * Flush (save) Resources to the backend. Performs the actual write of
   * data to sequoia for [save()]{@link Resource#save}
   *
   * @see {@link Resource#save}
   * @private
   *
   * @returns {Promise} - the `fetch` Promise
   */
  flush() {
    if (this.is_new === true) {
      return this.resourcefulEndpoint.store(this);
    }

    return this.resourcefulEndpoint.update(this);
  }

  /**
   * Save any [links]{@link Resource#link} that have been applied or resolve
   * immediately if there are none
   *
   * @private
   *
   * @returns {Promise}
   */
  saveIndirectLinks() {
    if (this.indirectlyLinkedResources.length === 0) {
      return Promise.resolve();
    }

    return Promise.all(this.indirectlyLinkedResources.map(link => link.save()));
  }

  /**
   * Save this Resource to the sequoia backend.
   *
   * Any [links]{@link Resource#link} that have also been applied in will also be saved at this point.
   *
   * @see {@link Resource#link}
   * @see {@link Resource#saveIndirectLinks}
   * @see {@link Resource#flush}
   *
   * @returns {Promise}
   */
  save() {
    if (this.resourcefulEndpoint) {
      const clearLinks = (resource) => {
        this.indirectlyLinkedResources = [];

        return resource;
      };

      // TODO: this should know whether this is a `new_resource` and `flush()` it first.
      // Should it also know the order? If only indirect links/relationships have been
      // added, don't bother `flush()ing` if the Resource exists already?
      return this.saveIndirectLinks()
        .then(() => this.flush())
        .then(clearLinks);
    }

    return Promise.reject(NO_RESOURCEFUL_ENDPOINT_ERROR);
  }

  /**
   * Destroy (DELETE) this Resource.
   *
   * @see {@link ResourcefulEndpoint#destroy}
   *
   * @returns {Promise}
   */
  destroy() {
    if (this.resourcefulEndpoint) {
      return this.resourcefulEndpoint.destroy(this);
    }

    return Promise.reject(NO_RESOURCEFUL_ENDPOINT_ERROR);
  }

  /**
   * @typedef {Object} Validation
   * @property {ValidationError} code - Error code
   * @property {string} message - What was invalid
   * @property {Object} typeInfo - The full typeInfo from the descriptor
   * @property {boolean} valid - Whether the field is valid or not
   */

  /**
   * Validate a specific field in the Resource.
   *
   * @param {string} field - the field to validate e.g. 'ratings'
   *
   * @returns {Validation}
   */
  validateField(field) {
    let code = ValidationError.NONE;
    let message = '';
    let typeInformation;
    let valid = false;

    if (!(field in this.getResourceFields())) {
      message = `${field} does not exist`;
      code = ValidationError.NO_FIELD;
    } else {
      const currentField = this.getResourceFields()[field];
      const { typeInfo, allowedValueMappings } = currentField;
      typeInformation = typeInfo;

      if (this[field] === undefined || this[field] === null) {
        if (currentField.required) {
          message = `${field} is required`;
          code = ValidationError.REQUIRED_FIELD;
        }
      } else if (currentField.readOnly === true) {
        // Skip readonly fields
        code = ValidationError.NONE;
      } else if (allowedValueMappings) {
        const allowedValues = Object.values(allowedValueMappings);
        if (!allowedValues.includes(this[field])) {
          message = `${field} is not one of ${allowedValues.join(', ')}`;
          code = ValidationError.NOT_ALLOWED;
        }
      } else if (typeInfo) {
        if ('pattern' in typeInfo) {
          // Simple value
          if (!new RegExp(typeInfo.pattern).test(this[field])) {
            message = `${field} does not match ${typeInfo.pattern}`;
            code = ValidationError.INVALID_VALUE;
          }
        } else if ('keys' in typeInfo) {
          // Map
          const re = new RegExp(typeInfo.keys.pattern);

          Object.keys(this[field]).forEach((key) => {
            if (!re.test(key)) {
              message += `${field}.${key} does not match ${
                typeInfo.keys.pattern
              }. `;
              code = ValidationError.INVALID_MAP;
            } else if ('values' in typeInfo) {
              const allowedValues = typeInfo.values[key].values;

              if (!allowedValues.includes(this[field][key])) {
                message += `${field}.${key} is not one of ${allowedValues.join(
                  ', '
                )}. `;
                code = ValidationError.INVALID_MAP;
              }
            }
          });
        }
      }
    }

    if (code === 0) {
      valid = true;
    }

    return {
      code,
      field,
      message,
      typeInfo: typeInformation,
      valid
    };
  }

  /**
   * Validate the resource.
   *
   * This method uses {@link Resource#validateField} on each field in the descriptor
   * and adds any invalid fields to the {@link Resource.errors} array for later querying.
   *
   * @example
   * contents.validate().catch((resource) => {
   *   // Show resource.errors[]
   * }).then((resource) => {
   *   if (!resource.errors.length) {
   *     return resource.save().then(() => {
   *       // do something on successfully saving
   *     });
   *   }
   *
   *   return Promise.reject(resource);
   * }).catch((resource) => {
   *   // Or show resource.errors[] here (or errors from save()ing)
   * });
   *
   * @see {@link Resource#validateField}
   *
   * @returns {Promise}
   */
  validate() {
    this.errors = [];

    Object.keys(this.getResourceFields()).forEach((field) => {
      const validation = this.validateField(field);

      if (!validation.valid) {
        this.errors.push(validation);
      }
    });

    if (this.errors.length) {
      return Promise.reject(new Error(this));
    }

    return Promise.resolve(this);
  }

  /**
   * Get the relationship info from the descriptor. When passing in
   * a Resource, the relationship will be inferred from its
   * {@link ResourcefulEndpoint#pluralName}. Pass a string to be explicit.
   * Note, when using a String value, this uses the key name in the descriptor's
   * relationship info, not the resourceType.
   *
   * @param {string|Resource} resource - A `string` or {@link Resource} to get relationship information for
   *
   * @see {@link Resource#linkResource}
   * @see {@link ResourcefulEndpoint#relationshipFor}
   *
   * @private
   *
   * @returns {undefined}
   */
  getRelationshipFor(resource) {
    if (typeof resource === 'string') {
      const { relationships } = this.resourcefulEndpoint;

      if (!(resource in relationships)) {
        throw new Error(`Relationship '${resource}' does not exist`);
      }

      return relationships[resource];
    }

    return this.resourcefulEndpoint.relationshipFor(
      resource.resourcefulEndpoint.pluralName
    );
  }

  /**
   * Add a resource ref to the appropriate relationship so it is linked
   * to this Resource.
   *
   * @param {string} ref - the Resource's `ref` to link
   * @param {Object} relationship - The relationship from the descriptor obtained from {@link Resource#getRelationshipFor}
   * @param {Resource?} resource - Specify this when linking an indirect relationship.
   * Defaults to the current {@link Resource} instance
   *
   * @see {@link Resource#getRelationshipFor}
   * @private
   *
   */
  linkRefToResource(ref, relationship, resource = this) {
    const { fieldNamePath } = relationship;

    // TODO: this will eventually be on the descriptor, but working
    // round it for now with the sequoia convention
    relationship.array = fieldNamePath.endsWith('Refs');

    if (relationship.array === true) {
      const existingRelationships = resource[fieldNamePath];

      if (!Array.isArray(existingRelationships)) {
        resource[fieldNamePath] = [ref];
      } else if (!existingRelationships.includes(ref)) {
        resource[fieldNamePath].push(ref);
      }
    } else {
      resource[fieldNamePath] = ref;
    }
  }

  /**
   * Link a {@link Resource} with this Resource
   *
   * If the link is `direct`, simply update *this* Reource with the relationship info.
   * If the link is `indirect`, add a potential link (not yet saved) to the
   * `indirectlLinkedResources` array to be flush when calling [save()]{@link Resource#save} later.
   *
   * @param {Resource} resource - the Resource to link
   * @param {string} as - Override the relationship type for this link.
   *
   * @see {@link Resource#linkRefToResource}
   *
   * @private
   */
  linkResource(resource, as) {
    const relationship = this.getRelationshipFor(as || resource);

    if (relationship.type === 'direct') {
      this.linkRefToResource(resource.ref, relationship);
    } else if (relationship.type === 'indirect') {
      this.linkRefToResource(
        this.ref,
        resource.getRelationshipFor(as || this),
        resource
      );
      this.indirectlyLinkedResources.push(resource);
    }
  }

  /**
   * Link one or many {@link Resource}s with this Resource
   * When linking an array of resources, if the relationship is not an array type
   * the last member of the array will become the only link. For example,
   * `content.link([...contents], 'parent')` will end up with
   * `resource.parentRef === contents[contents.length - 1].ref`.
   * Due to this, it is expected to only `link` certain resources at a time e.g.
   * `content.link(parentContent).link(assets).link(members, 'members').save()`
   *
   * @param {Resource[]} resource - the Resource (or array or Resources) to link
   * @param {string} as - Override the relationship type for this link.
   *
   * @example
   * const assets = service.resourcefulEndpoint('assets');
   * const asset = await assets.readOne('some:asset-ref');
   *
   * // If it's a known relationship, you don't have to bother providing the
   * // relationship type:
   * content.link(asset).save(); // Link and save
   *
   * // You can link a ResourceCollection (or any iterable):
   * const assets = await assets.browse(); // Get all assets already stored
   * content.link(assets).save(); // Link them all and save
   *
   * // You can provide the relationship type:
   * const relatedContent = await contents.readOne('some:other-ref');
   * content.link(relatedContent).save(); // Will default to the 'parent' relationship
   *
   * content.link(relatedContent, 'members').save(); // Will now be a 'member' of the content (e.g. episodes of a series)
   *
   * @returns {Resource} - the current Resource instance
   */
  link(resource, as) {
    if (!isIterable(resource)) {
      this.linkResource(resource, as);
    } else {
      resource.forEach(r => this.linkResource(r, as));
    }

    return this;
  }

  /**
   * Query where the current resource has linked items of a particular
   * relationship kind.
   *
   * @param {string} relationship - The name of the relationship in the descriptor
   * e.g. 'assets', 'categories', 'parent'
   *
   * @example
   * content.hasLinked('assets');
   * content.hasLinked('categories');
   *
   * @returns {boolean}
   */
  hasLinked(relationship) {
    return (
      this.linked
      && this.linked[relationship]
      && this.linked[relationship].length > 0
    );
  }

  // Convenience methods:
  // TODO: these should be rolled into an optional mixin
  /* istanbul ignore next */
  getLinkedAssetOfType(type) {
    if (this.hasLinked('assets')) {
      return this.linked.assets.filter(item => item.type === type);
    }

    return [];
  }

  /* istanbul ignore next */
  get categories() {
    if (this.hasLinked('categories')) {
      return this.linked.categories;
    }

    return null;
  }

  /* istanbul ignore next */
  get images() {
    return this.getLinkedAssetOfType('image');
  }

  /* istanbul ignore next */
  get videos() {
    return this.getLinkedAssetOfType('video');
  }

  /* istanbul ignore next */
  get trailers() {
    return this.videos.filter((item) => {
      const { tags } = item;

      if (tags) {
        return (
          item.tags.includes('trailerondemand')
          || item.tags.includes('usage:trailer')
        );
      }

      return true;
    });
  }

  /* istanbul ignore next */
  get mainVideos() {
    return this.videos.filter((item) => {
      const { tags } = item;

      if (tags) {
        return (
          !item.tags.includes('trailerondemand')
          && !item.tags.includes('usage:trailer')
        );
      }

      return true;
    });
  }

  /* istanbul ignore next */
  primaryBoxArt() {
    return this.images.find((item) => {
      const { tags } = item;

      if (tags) {
        return (
          item.tags.includes('portrait') || item.tags.includes('usage:boxart')
        );
      }

      return false;
    });
  }

  /* istanbul ignore next */
  primaryStill() {
    return this.images.find(
      item => item.tags
        && (item.tags.includes('usage:still') || item.tags.includes('landscape'))
    );
  }

  /* istanbul ignore next */
  trailer() {
    return (
      this.trailers.find(
        item => item.tags && item.tags.includes('console:primary')
      ) || this.trailers[0]
    );
  }

  /* istanbul ignore next */
  mainVideo(format) {
    return this.mainVideos.find(item => item.fileFormat === format);
  }
}

export default Resource;
