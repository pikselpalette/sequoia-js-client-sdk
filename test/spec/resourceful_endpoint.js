import fetchMock from 'fetch-mock';
import Resource from '../../lib/resource.js';
import Query from '../../lib/query.js';
import ResourcefulEndpoint from '../../lib/resourceful_endpoint.js';
import Transport from '../../lib/transport.js';
import ResourceCollection from '../../lib/resource_collection.js';
import mediaItemsFixture from '../fixtures/media-items.json';

const pluralName = 'contents';
const singularName = 'content';
const hyphenatedPluralName = 'contents';
const serviceName = 'metadata';
const relationships = { test: { desription: 'test', resourceType: 'test' } };

const mockDescriptor = {
  location: 'http://localhost/metadata',
  pluralName,
  singularName,
  hyphenatedPluralName,
  serviceName,
  relationships,
  tenant: 'test'
};

describe('ResourcefulEndpoint', () => {
  let resourcefulEndpoint;
  let resource;
  let transport;
  const testRef = 'test:testcontent';

  beforeEach(() => {
    transport = new Transport();
    fetchMock.mock('*', mediaItemsFixture);
    resourcefulEndpoint = new ResourcefulEndpoint(transport, mockDescriptor);

    resource = resourcefulEndpoint.newResource({
      ref: testRef,
      name: 'testcontent',
      title: 'A test resource'
    });
  });

  afterEach(fetchMock.restore);

  describe('constructor', () => {
    it('should set its `resourceful` property to the supplied data from the descriptor', () => {
      expect(resourcefulEndpoint.transport).toBe(transport);
      expect(resourcefulEndpoint.resourceful).toBeDefined();
    });
  });

  describe('responseToResource', () => {
    it('should create a Resource from the returned JSON', () => {
      const responseResource = resourcefulEndpoint.responseToResource({
        [pluralName]: [resource]
      });

      expect(responseResource instanceof Resource).toBe(true);
      expect(responseResource).toEqual(resource);
    });
  });

  describe('owner', () => {
    it('should be the `resourceful.tenant`', () => {
      expect(resourcefulEndpoint.resourceful).toBeDefined();
      expect(resourcefulEndpoint.owner).toEqual(resourcefulEndpoint.resourceful.tenant);
    });

    it('should be undefined when there is no `resourceful`', () => {
      const emptyResourcefulEndpoint = new ResourcefulEndpoint();
      expect(emptyResourcefulEndpoint.owner).toBe(undefined);
    });
  });

  describe('newResource', () => {
    it('should return a new Resource instance', () => {
      expect(resourcefulEndpoint.newResource() instanceof Resource).toBe(true);
    });

    it('should mark the new Resource instance with { is_new: true }', () => {
      expect(resourcefulEndpoint.newResource().rawData).toEqual(expect.objectContaining({ is_new: true }));
    });

    it('should mark the new Resource instance with a resourcefulEndpoint equal to this object', () => {
      expect(resourcefulEndpoint.newResource().resourcefulEndpoint).toBe(resourcefulEndpoint);
    });

    it('should populate the new Resource instance with the object passed in', () => {
      const data = {
        ref: testRef,
        title: 'Test Content',
        mediumSynopsis: 'A test medium synopsis',
        availabilityEndAt: '2017-12-31T00:00:00.000Z',
        duration: 'PT0H0M'
      };

      expect(resourcefulEndpoint.newResource(data).rawData).toEqual(expect.objectContaining(data));
    });

    it('should default the `owner` to the current tenant', () => {
      expect(resourcefulEndpoint.newResource().rawData).toEqual(expect.objectContaining({ owner: 'test' }));
    });

    it('should allow the `owner` to be overriden', () => {
      const data = { owner: 'different-owner' };
      expect(resourcefulEndpoint.newResource(data).rawData).toEqual(expect.objectContaining(data));
    });

    it('should use the ref provided', () => {
      const data = { ref: 'some:ref' };
      expect(resourcefulEndpoint.newResource(data).rawData).toEqual(expect.objectContaining({ ref: 'some:ref' }));
    });

    it('should create the ref when a name is passed', () => {
      const data = { name: 'test-name', owner: 'sequoia' };
      expect(resourcefulEndpoint.newResource(data).rawData).toEqual(expect.objectContaining({ ref: 'sequoia:test-name' }));
    });
  });

  describe('newResourceCollection', () => {
    it('should return a new Resource instance', () => {
      expect(resourcefulEndpoint.newResourceCollection() instanceof ResourceCollection).toBe(true);
    });

    it('should take an array of items', () => {
      const collection = resourcefulEndpoint.newResourceCollection([
        { name: 'foo' },
        { name: 'bar' }
      ]);

      expect(collection.collection).toEqual([
        new Resource({ name: 'foo' }, resourcefulEndpoint),
        new Resource({ name: 'bar' }, resourcefulEndpoint)
      ]);
    });

    it('should take an object but issue a deprecation warning', () => {
      jest.spyOn(console, 'warn');

      const collection = resourcefulEndpoint.newResourceCollection({
        [resourcefulEndpoint.resourceful.pluralName]: [
          { name: 'foo' },
          { name: 'bar' }
        ]
      });

      expect(collection.collection).toEqual([
        new Resource({ name: 'foo' }, resourcefulEndpoint),
        new Resource({ name: 'bar' }, resourcefulEndpoint)
      ]);

      expect(console.warn)
        .toHaveBeenCalledWith('Using newResourceCollection with an object is deprecated - pass an array instead');
    });
  });

  describe('relationships', () => {
    it('should return the relationships property from the descriptor', () => {
      expect(resourcefulEndpoint.relationships).toEqual(expect.objectContaining(relationships));
    });
  });
  describe('pluralName', () => {
    it('should return the pluralName property from the descriptor', () => {
      expect(resourcefulEndpoint.pluralName).toEqual(pluralName);
    });
  });

  describe('singularName', () => {
    it('should return the singularName property from the descriptor', () => {
      expect(resourcefulEndpoint.singularName).toEqual(singularName);
    });
  });

  describe('hyphenatedPluralName', () => {
    it('should return the hyphenatedPluralName property from the descriptor', () => {
      expect(resourcefulEndpoint.hyphenatedPluralName).toEqual(hyphenatedPluralName);
    });
  });

  describe('serviceName', () => {
    it('should return the serviceName property from the descriptor', () => {
      expect(resourcefulEndpoint.serviceName).toEqual(serviceName);
    });
  });

  describe('batchSize', () => {
    it('should default to 100', () => {
      expect(resourcefulEndpoint.batchSize).toEqual(100);
      expect(new ResourcefulEndpoint(transport, Object.assign({}, mockDescriptor, {
        operations: {}
      })).batchSize).toEqual(100);

      expect(new ResourcefulEndpoint(transport, Object.assign({}, mockDescriptor, {
        operations: { storeBatch: {} }
      })).batchSize).toEqual(100);
    });

    it('should use the `limit` from the `storeBatch` operation', () => {
      expect(new ResourcefulEndpoint(transport, Object.assign({}, mockDescriptor, {
        operations: { storeBatch: { limit: 2 } }
      })).batchSize).toEqual(2);
    });
  });

  describe('criteriaToQuery', () => {
    it('should append the owner as a query string', () => {
      expect(resourcefulEndpoint.criteriaToQuery()).toContain('?owner=test');
    });

    it('should not append anything else when no criteria is supplied', () => {
      expect(resourcefulEndpoint.criteriaToQuery()).toMatch(/owner=test$/);
    });

    it('should not append anything else when criteria is supplied as an empty string', () => {
      expect(resourcefulEndpoint.criteriaToQuery('')).toMatch(/owner=test$/);
    });

    it('should append criteria when it not an empty string', () => {
      const criteria = 'something=else';
      expect(resourcefulEndpoint.criteriaToQuery(criteria)).toMatch(new RegExp(`&${criteria}$`));
    });

    it('should accept a Query instance', () => {
      const criteria = 'test=true';
      const query = new Query(criteria);
      jest.spyOn(query, 'toQueryString').mockImplementation(() => criteria);
      expect(resourcefulEndpoint.criteriaToQuery(query)).toMatch(new RegExp(`&${criteria}$`));
      expect(query.toQueryString).toHaveBeenCalled();
    });
  });

  describe('endPointUrl', () => {
    const testCriteria = 'query=test';

    beforeEach(() => jest.spyOn(resourcefulEndpoint, 'criteriaToQuery').mockImplementation(() => ''));

    it('should default to the location and pluralName', () => {
      expect(resourcefulEndpoint.endPointUrl()).toContain(mockDescriptor.location);
      expect(resourcefulEndpoint.endPointUrl()).toContain(mockDescriptor.pluralName);
    });

    it('should append the supplied ref', () => {
      expect(resourcefulEndpoint.endPointUrl(testRef)).toContain(testRef);
    });

    it('should call "criteriaToQuery" to append the supplied criteria', () => {
      resourcefulEndpoint.endPointUrl();
      expect(resourcefulEndpoint.criteriaToQuery).toHaveBeenCalledWith(undefined);

      resourcefulEndpoint.endPointUrl(testRef);
      expect(resourcefulEndpoint.criteriaToQuery).toHaveBeenCalledWith(undefined);

      resourcefulEndpoint.endPointUrl(testRef, testCriteria);
      expect(resourcefulEndpoint.criteriaToQuery).toHaveBeenCalledWith(testCriteria);
    });
  });

  describe('relationshipFor', () => {
    it('should return the relationship info', () => {
      expect(() => resourcefulEndpoint.relationshipFor('test')).not.toThrow();
      expect(resourcefulEndpoint.relationshipFor('test')).toEqual(expect.objectContaining(relationships.test));
    });

    it('should throw when requestion a relationship that does not exist', () => {
      expect(() => resourcefulEndpoint.relationshipFor('NOTHING')).toThrow();
    });
  });

  describe('transportOld method', () => {
    describe('browse', () => {
      it('should perform a GET on all content', async () => {
        await expect(resourcefulEndpoint.browse()).resolves.toBeTruthy();
        expect(fetchMock.lastUrl()).toEqual('http://localhost/metadata/contents?owner=test');
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'GET' }));
      });

      it('should resolve with a ResourceCollection', async () => expect(resourcefulEndpoint.browse()).resolves.toEqual({
        asymmetricMatch: actual => actual instanceof ResourceCollection
      }));
    });

    describe('all', () => {
      const mockAllPages = () => {
        fetchMock.mock('*', (url) => {
          let page = 1;

          const match = url.match(/page=([\d]+)/);

          if (match && match.length > 1) {
            [, page] = match;
          }

          return require(`../fixtures/media-items-${page}.json`); // eslint-disable-line global-require, import/no-dynamic-require
        });
      };

      beforeEach(() => {
        fetchMock.restore();
        mockAllPages();
      });

      afterEach(fetchMock.restore);

      it('should perform a GET on all content', async () => {
        jest.spyOn(resourcefulEndpoint, 'browse');

        await expect(resourcefulEndpoint.all()).resolves.toBeTruthy();

        expect(fetchMock.lastUrl()).toContain('&page=12');
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'GET' }));
        expect(resourcefulEndpoint.browse).toHaveBeenCalledTimes(12);
      });

      it('should resolve with an Object', async () => expect(resourcefulEndpoint.all()).resolves.toEqual({
        asymmetricMatch: actual => actual instanceof Object
      }));

      it('should return every value in the endpoint', async () => {
        const resourceCollection = await resourcefulEndpoint.all();
        expect(resourceCollection.collection.length)
          .toEqual(resourceCollection.rawData.meta.totalCount);
      });

      it('should return every value in the endpoint should have linked resources', async () => {
        const resourceCollection = await resourcefulEndpoint.all();
        expect(resourceCollection.collection.length)
          .toEqual(resourceCollection.rawData.meta.totalCount);
        resourceCollection.collection.forEach((r) => {
          expect(r.linked).not.toBe(null);
          expect(Object.keys[r.linked]).not.toBe(0);
        });
      });

      it('should still throw backend errors', async () => {
        fetchMock.restore();
        fetchMock.mock(/page=2/, { status: 401, body: 'unauthorised' });
        mockAllPages();

        return expect(resourcefulEndpoint.all()).rejects.toBeTruthy();
      });
    });

    describe('readOne', () => {
      it('should perform a GET on a single piece of content', async () => {
        await expect(resourcefulEndpoint.readOne(testRef)).resolves.toBeTruthy();
        expect(fetchMock.lastUrl()).toEqual(`http://localhost/metadata/contents/${testRef}?owner=test`);
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'GET' }));
      });

      it('should resolve with a Resource', async () => expect(resourcefulEndpoint.readOne(testRef)).resolves.toEqual({
        asymmetricMatch: actual => actual instanceof Resource
      }));
    });

    describe('readMany', () => {
      it('should perform a GET on a many pieces of content', async () => {
        await expect(resourcefulEndpoint.readMany([`${testRef}1`, `${testRef}2`]))
          .resolves.toBeTruthy();
        expect(fetchMock.lastUrl()).toEqual(`http://localhost/metadata/contents/${testRef}1,${testRef}2?owner=test`);
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'GET' }));
      });

      it('should resolve with a Resource', async () => expect(resourcefulEndpoint.readMany([testRef])).resolves.toEqual({
        asymmetricMatch: actual => actual instanceof ResourceCollection
      }));
    });

    describe('store', () => {
      it('should POST a single piece of content', async () => {
        await expect(resourcefulEndpoint.store(resource)).resolves.toBeTruthy();
        expect(fetchMock.lastUrl()).toEqual('http://localhost/metadata/contents?owner=test');
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'POST' }));
      });
    });

    describe('update', () => {
      it('should PUT a single piece of content', async () => {
        await expect(resourcefulEndpoint.update(resource)).resolves.toBeTruthy();
        expect(fetchMock.lastUrl()).toEqual(`http://localhost/metadata/contents/${testRef}?owner=test`);
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'PUT' }));
      });
    });

    describe('destroy', () => {
      it('should perform a POST a single piece of content', async () => {
        await expect(resourcefulEndpoint.destroy(resource)).resolves.toBeTruthy();
        expect(fetchMock.lastUrl()).toEqual(`http://localhost/metadata/contents/${testRef}?owner=test`);
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'DELETE' }));
      });

      it('should accept a string of ref(s)', async () => {
        const refs = 'test:one,test:two';

        await expect(resourcefulEndpoint.destroy(refs)).resolves.toBeTruthy();
        expect(fetchMock.lastUrl()).toEqual(`http://localhost/metadata/contents/${refs}?owner=test`);
        expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'DELETE' }));
      });
    });
  });
});
