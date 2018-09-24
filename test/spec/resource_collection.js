import Resource from '../../lib/resource';
import ResourceCollection, { NO_NEXT_PAGE_ERROR, NO_RESOURCEFUL_ENDPOINT_ERROR } from '../../lib/resource_collection';
import ResourcefulEndpoint from '../../lib/resourceful_endpoint';
import Transport from '../../lib/transport';
import mediaItemFixture from '../fixtures/media-items.json';
import lastMediaItemFixture from '../fixtures/media-items-12.json';
import metadataDescriptorFixture from '../fixtures/metadata-descriptor.json';
import creditsWithThroughFixture from '../fixtures/credits-with-through.json';

describe('ResourceCollection', () => {
  let mockDescriptor;
  let resourcefulEndpoint;
  let resourceCollection;

  beforeEach(() => {
    mockDescriptor = Object.assign(metadataDescriptorFixture.resourcefuls.contents, {
      location: 'http://localhost/metadata',
      tenant: 'test',
      pluralName: 'contents'
    });

    resourcefulEndpoint = new ResourcefulEndpoint(new Transport(), mockDescriptor);

    resourceCollection = new ResourceCollection(mediaItemFixture);
  });

  it('should keep the initial data as a "rawData" property', () => {
    expect(resourceCollection.rawData).toBeDefined();
  });

  it('should call toJSON on child Resources when calling toJSON', () => {
    resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);
    expect(resourceCollection.toJSON).toBeDefined();

    const spy = jest.spyOn(resourceCollection.collection[3], 'toJSON');
    resourceCollection.toJSON();

    expect(spy).toHaveBeenCalled();
  });

  it('"page" should return the value from the `meta` part of the response json', () => {
    expect(resourceCollection.page).toBe(1);
  });

  it('"perPage" should return the value from the `meta` part of the response json', () => {
    expect(resourceCollection.perPage).toBe(24);
  });

  it('"totalCount" should return the value from the `meta` part of the response json', () => {
    resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);
    expect(resourceCollection.totalCount).toBe(278);

    resourceCollection.rawData = {};
    // If there's no metadata telling us the totalCount, it'll be the collection.length
    // which is just the first page of resources
    expect(resourceCollection.totalCount).toBe(24);
  });

  it('"serialise" should stringify the ResourceCollection, nesting it in the resourceful\'s pluralname', () => {
    resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);

    jest.spyOn(JSON, 'stringify');
    jest.spyOn(resourceCollection, 'toJSON').mockImplementation(() => []);

    resourceCollection.serialise();
    expect(JSON.stringify).toHaveBeenCalledWith(expect.objectContaining({ contents: [] }), null, '  ');
    expect(resourceCollection.toJSON).toHaveBeenCalled();
  });

  describe('setData method', () => {
    it('should set this.rawData', () => {
      resourceCollection.setData(lastMediaItemFixture);
      expect(resourceCollection.rawData).toEqual(lastMediaItemFixture);
    });

    it('should set this.collection when given valid arguments', () => {
      expect(resourceCollection.collection.length).toEqual(0);
      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      expect(resourceCollection.resourcefulEndpoint).toEqual(resourcefulEndpoint);
      resourceCollection.setData(lastMediaItemFixture);
      expect(resourceCollection.collection.length).toEqual(14);
    });

    it('should not set this.collection if we have no resourcefulEndpoint', () => {
      expect(resourceCollection.collection).toEqual([]);
      expect(resourceCollection.resourcefulEndpoint).toEqual(undefined);
      resourceCollection.setData(lastMediaItemFixture);
      expect(resourceCollection.collection).toEqual([]);
    });

    it('should not set this.collection if we have no rawData', () => {
      expect(resourceCollection.collection).toEqual([]);
      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      expect(resourceCollection.resourcefulEndpoint).toEqual(resourcefulEndpoint);
      resourceCollection.setData();
      expect(resourceCollection.collection).toEqual([]);
    });

    it('should not set this.collection if this.rawdata has no pluralName', () => {
      const newLastMediaItemFixture = lastMediaItemFixture;
      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      newLastMediaItemFixture[resourcefulEndpoint.pluralName] = null;
      resourceCollection.setData(newLastMediaItemFixture);
      expect(resourceCollection.collection).toEqual([]);
    });

    it('should create new resources for the collection when rawData.linked is empty', () => {
      expect(resourceCollection.collection.length).toEqual(0);
      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      lastMediaItemFixture.linked = {};
      const result = resourceCollection.setData(lastMediaItemFixture);
      expect(result.collection).toEqual([]);
      expect(result.rawData.linked).toEqual({});
      expect(result.resourcefulEndpoint).toEqual(resourcefulEndpoint);
    });

    it('should set linked data to the reference if the linkByRefName matched the resource.ref name', () => {
      expect(resourceCollection.collection.length).toEqual(0);
      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      const rawData = Object.assign({}, lastMediaItemFixture);
      rawData.contents = [{
        ref: 'Joe'
      }];
      rawData.linked = {
        assets: [
          {
            contentRef: 'Joe'
          }
        ]
      };

      const result = resourceCollection.setData(rawData);
      expect(result.collection[0].linked.assets[0].contentRef).toEqual('Joe');
    });

    it('should set linked data to the reference if the linkedData does not have linkByReferenceName', () => {
      expect(resourceCollection.collection.length).toEqual(0);
      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      const rawData = Object.assign({}, lastMediaItemFixture);
      rawData.contents = [{
        ref: 'Joe'
      }];
      rawData.linked = {
        assets: [
          {
            name: 'Joe'
          }
        ]
      };

      const result = resourceCollection.setData(rawData);
      expect(result.collection[0].linked.assets[0].name).toEqual('Joe');
    });

    it('should set linked data to the reference if the linkByRefName matched the resource.ref name', () => {
      expect(resourceCollection.collection.length).toEqual(0);
      const rawData = Object.assign({}, lastMediaItemFixture);
      const resource = { ref: 'Joe' };
      const item = { contentRef: 'NotJoe' };

      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      rawData.contents = [resource];
      rawData.linked = {
        assets: [item]
      };

      const result = resourceCollection.setData(rawData);
      expect(result.collection[0].linked.assets.length).toEqual(0);
    });

    it('should not set linked data to the reference if the rawData.contents is empty', () => {
      expect(resourceCollection.collection.length).toEqual(0);
      resourceCollection.resourcefulEndpoint = resourcefulEndpoint;
      const rawData = Object.assign({}, lastMediaItemFixture);
      rawData.contents = [];

      const result = resourceCollection.setData(rawData);
      expect(result.rawData.linked).toEqual({});
      expect(result.collection).toEqual([]);
    });

    describe('through relationships', () => {
      let rawData;
      beforeEach(() => {
        mockDescriptor = Object.assign(metadataDescriptorFixture.resourcefuls.credits, {
          location: 'http://localhost/metadata',
          tenant: 'test',
          pluralName: 'credits'
        });
        resourcefulEndpoint = new ResourcefulEndpoint(new Transport(), mockDescriptor);
        resourceCollection = new ResourceCollection(
          mediaItemFixture,
          null,
          resourcefulEndpoint
        );
        rawData = creditsWithThroughFixture;
      });

      it('has a resourcefulEndpoint that has a relationship that has a through relationship', () => {
        const relationship = resourcefulEndpoint.resourceful.relationships['relatedMaterials.assets'];
        expect(relationship).toBeDefined();
        expect(relationship.through).toBeDefined();
      });

      it('has rawData', () => {
        expect(rawData).toBeDefined();
      });

      it('has a collection', () => {
        const result = resourceCollection.setData(rawData);
        expect(result && result.collection).toBeDefined();
      });

      it('has an item in collection that has values in relatedMaterialRefs', () => {
        const result = resourceCollection.setData(rawData);
        const { collection } = result;
        const itemWithRelatedMaterialRefs = collection[0];

        expect(
          itemWithRelatedMaterialRefs &&
          itemWithRelatedMaterialRefs.relatedMaterialRefs
        ).toBeDefined();

        expect(itemWithRelatedMaterialRefs.relatedMaterialRefs.length).toEqual(1);
      });

      describe('item with relatedMaterialRefs', () => {
        let result;
        let collection;
        let itemWithRelatedMaterialRefs;

        beforeEach(() => {
          result = resourceCollection.setData(rawData);
          collection = result && result.collection;
          itemWithRelatedMaterialRefs = collection[0];
        });

        it('has linked data', () => {
          expect(itemWithRelatedMaterialRefs.linked).toBeDefined();
        });

        it('has the same number of linked data the amount of relatedMaterialRefs', () => {
          const refs = itemWithRelatedMaterialRefs.relatedMaterialRefs;
          const linked = itemWithRelatedMaterialRefs.linked['relatedMaterials.assets'];
          expect(refs.length).toEqual(linked.length);
        });

        it('has matching linked data and relatedMaterialRefs', () => {
          const refs = itemWithRelatedMaterialRefs.relatedMaterialRefs;
          const linked = itemWithRelatedMaterialRefs.linked['relatedMaterials.assets'];

          linked
            .map(l => l.contentRef)
            .forEach((l) => {
              expect(refs.includes(l));
            });
        });
      });
    });
  });

  describe('transportOld method', () => {
    const successfulFetch = JSON.stringify({ test: 'success' });

    beforeEach(() => {
      jest.spyOn(resourceCollection, 'fetch').mockImplementation(() => Promise.resolve(successfulFetch));
    });

    describe('nextPage', () => {
      it('should call "fetch" when there is a next page of results', async () => {
        expect(resourceCollection.nextPage()).resolves.toEqual(successfulFetch);
      });

      it('should reject when there is no next page of results', async () => {
        delete resourceCollection.rawData.meta.next;
        return expect(resourceCollection.nextPage()).rejects.toEqual(NO_NEXT_PAGE_ERROR);
      });
    });

    describe('previousPage', () => {
      it('should call "fetch" when there is a previous page of results', async () => {
        resourceCollection.setData(lastMediaItemFixture);

        await expect(resourceCollection.previousPage()).resolves.toBeTruthy();

        expect(resourceCollection.fetch).toHaveBeenCalled();
      });

      it('should reject when there is no next page of results', async () => {
        await expect(resourceCollection.previousPage()).rejects.toBeTruthy();
        expect(resourceCollection.fetch).not.toHaveBeenCalled();
      });
    });

    it('"firstPage" should call "fetch" with the first page of results from the feed', async () => {
      await resourceCollection.firstPage();
      expect(resourceCollection.fetch).toHaveBeenCalledWith(mediaItemFixture.meta.first);
    });

    it('"lastPage" should call "fetch" with the last page of results from the feed', async () => {
      await resourceCollection.lastPage();
      expect(resourceCollection.fetch).toHaveBeenCalledWith(mediaItemFixture.meta.last);
    });

    it('"getPage" should call "fetch" with the specified page of results', async () => {
      await resourceCollection.getPage(9);
      expect(resourceCollection.fetch).toHaveBeenCalledWith(expect.stringContaining('&page=9'));

      await resourceCollection.getPage(1234);
      expect(resourceCollection.fetch).toHaveBeenCalledWith(expect.stringContaining('&page=1234'));
    });

    describe('validate', () => {
      beforeEach(() => {
        resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);
      });

      it('should resolve with the current collection', async () => {
        resourceCollection.collection.forEach(r => jest.spyOn(r, 'validate').mockImplementation(() => Promise.resolve()));
        return expect(resourceCollection.validate()).resolves.toEqual(resourceCollection);
      });

      it('should reject when one or more of the Resources in the collection are invalid', async () => {
        resourceCollection.collection.forEach(r => jest.spyOn(r, 'validate').mockImplementation(() => Promise.reject()));
        return expect(resourceCollection.validate()).rejects.toBeFalsy();
      });
    });

    describe('save', () => {
      describe('without a resourceful collection', () => {
        it('should reject', async () => expect(resourceCollection.save()).rejects.toEqual(NO_RESOURCEFUL_ENDPOINT_ERROR));
      });

      describe('with a resourceful collection', () => {
        it('should explode the collection and call store() on each batch', async () => {
          resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);

          jest.spyOn(resourceCollection, 'explode').mockImplementation(() => [1, 2, 3, 4]);
          jest.spyOn(resourcefulEndpoint, 'store').mockImplementation(() => Promise.resolve());

          const saver = resourceCollection.save();
          expect(resourceCollection.explode).toHaveBeenCalled();
          expect(resourcefulEndpoint.store).toHaveBeenCalledTimes(4);

          return expect(saver).resolves.toBeTruthy();
        });

        it('should explode the collection and call store() on each batch based on supplied batchSize', async () => {
          resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);

          jest.spyOn(resourceCollection, 'explode').mockImplementation(() => [1, 2]);
          jest.spyOn(resourcefulEndpoint, 'store').mockImplementation(() => Promise.resolve());

          const saver = resourceCollection.save(2);
          expect(resourceCollection.explode).toHaveBeenCalled();
          expect(resourcefulEndpoint.store).toHaveBeenCalledTimes(2);

          return expect(saver).resolves.toBeTruthy();
        });

        it('should throw an error if saving to the store fails', () => {
          resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);

          jest.spyOn(resourceCollection, 'explode').mockImplementation(() => [1, 2, 3, 4]);
          jest.spyOn(resourcefulEndpoint, 'store').mockImplementation(() => Promise.reject());

          const saver = resourceCollection.save();
          expect(resourceCollection.explode).toHaveBeenCalled();
          expect(resourcefulEndpoint.store).toHaveBeenCalledTimes(4);

          return expect(saver).rejects.toBeTruthy();
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });
      });
    });

    describe('destroy', () => {
      describe('without a resourceful collection', () => {
        it('should reject', async () => expect(resourceCollection.destroy()).rejects.toEqual(NO_RESOURCEFUL_ENDPOINT_ERROR));
      });

      describe('with a resourceful collection', () => {
        it('should explode the collection and call destroy() on each batch', async () => {
          resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);
          const dummyCollection = {
            collection: [{ ref: 'test:1' }, { ref: 'test:2' }]
          };

          jest.spyOn(resourceCollection, 'explode').mockImplementation(() => [dummyCollection, dummyCollection]);
          jest.spyOn(resourcefulEndpoint, 'destroy').mockImplementation(() => {});

          const destroyer = resourceCollection.destroy();
          expect(resourceCollection.explode).toHaveBeenCalled();
          expect(resourcefulEndpoint.destroy).toHaveBeenCalledTimes(2);
          expect(resourcefulEndpoint.destroy).toHaveBeenCalledWith(expect.stringContaining('test:1,test:2'));

          return expect(destroyer).resolves.toBeTruthy();
        });
      });
    });
  });

  describe('explode', () => {
    beforeEach(() => {
      resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);
      Object.defineProperty(resourceCollection, 'totalCount', {
        get: () => resourceCollection.collection.length
      });
      jest.spyOn(resourceCollection.resourcefulEndpoint, 'newResourceCollection');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should default to splitting on the batchSize of the resourceful endpoint', () => {
      const collections = resourceCollection.explode();

      expect(collections.length).toEqual(1);
      expect(resourceCollection.resourcefulEndpoint.newResourceCollection).toHaveBeenCalledTimes(1);
    });

    it('should accept a `size` paramater to split into smaller batches', () => {
      // Override to just get one exploded 'page'
      const collections = resourceCollection.explode(2);

      expect(collections.length).toEqual(12);
      expect(resourceCollection.resourcefulEndpoint.newResourceCollection).toHaveBeenCalledTimes(12);
    });
  });

  describe('fetch', () => {
    describe('without a resourceful collection', () => {
      it('should reject', async () => expect(resourceCollection.fetch()).rejects.toEqual(NO_RESOURCEFUL_ENDPOINT_ERROR));
    });

    describe('with a resourceful collection', () => {
      const successfulFetch = JSON.stringify({ rawData: 'success', collection: ['test'] });

      beforeEach(() => {
        jest.spyOn(resourcefulEndpoint, 'browse').mockImplementation(() => Promise.resolve(successfulFetch));
        resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);
      });

      it('should resolve', async () => expect(resourceCollection.fetch()).resolves.toBeTruthy());

      it('should call resourcefulEndpoint.browse with the initially set criteria', async () => {
        await expect(resourceCollection.fetch()).resolves.toBeTruthy();
        expect(resourcefulEndpoint.browse).toHaveBeenCalledWith('');
      });

      it('should call resourcefulEndpoint.browse with new criteria', async () => {
        await expect(resourceCollection.fetch('TEST')).resolves.toBeTruthy();
        expect(resourcefulEndpoint.browse).toHaveBeenCalledWith('TEST');
      });

      it('should remove the owner from the criteria when calling resourcefulEndpoint.browse', async () => {
        await expect(resourceCollection.fetch('&owner=test&something=else')).resolves.toBeTruthy();
        expect(resourcefulEndpoint.browse).toHaveBeenCalledWith('&something=else');
      });

      it('should remove the owner when first param from the criteria when calling resourcefulEndpoint.browse', async () => {
        await expect(resourceCollection.fetch('owner=test&something=else')).resolves.toBeTruthy();
        expect(resourcefulEndpoint.browse).toHaveBeenCalledWith('&something=else');
      });
    });
  });

  describe('local collection', () => {
    const resourceData = mediaItemFixture.contents[0];

    beforeEach(() => {
      resourceCollection = new ResourceCollection(mediaItemFixture, null, resourcefulEndpoint);
    });

    describe('add', () => {
      let resource;

      beforeEach(() => {
        // Make a bare collection for testing adding
        resource = resourcefulEndpoint.newResource(resourceData);
        resourceCollection = new ResourceCollection({}, null, resourcefulEndpoint);
        jest.spyOn(resourcefulEndpoint, 'newResource');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should create a new Resource if the supplied data is a bare Object', () => {
        resourceCollection.add(resourceData);

        expect(resourcefulEndpoint.newResource).toHaveBeenCalledWith(expect.objectContaining(resourceData));
      });

      it('should not create a new Resource if the supplied data is a Resource', () => {
        resourceCollection.add(resource);

        expect(resourcefulEndpoint.newResource).not.toHaveBeenCalled();
      });

      it('should add Resource to the local collection', () => {
        resourceCollection.add(resource);

        expect(resourceCollection.collection.length).toEqual(1);

        resourceCollection.add(resource);

        expect(resourceCollection.collection.length).toEqual(2);
      });

      it('should return the added Resource', () => {
        expect(resourceCollection.add(resource) instanceof Resource).toBe(true);
      });
    });

    describe('remove', () => {
      it('should remove the found resource from the local collection', () => {
        expect(resourceCollection.collection.length).toEqual(24);

        resourceCollection.remove('sa-team:UTV-15162');

        expect(resourceCollection.collection.length).toEqual(23);
      });

      it('should return the removed Resource', () => {
        const resource = resourceCollection.remove('sa-team:UTV-15162');
        expect(resource instanceof Resource).toBe(true);
        expect(resource.ref).toEqual('sa-team:UTV-15162');
      });

      it('should return null if no Resource in the collection has the supplied ref', () => {
        expect(resourceCollection.remove('test:doesnotexist')).toBeNull();
      });
    });

    describe('finder methods', () => {
      describe('find', () => {
        it('should return a Resource if there is a resource in the local collection with the supplied ref', () => {
          const resource = resourceCollection.find('sa-team:UTV-15162');
          expect(resource instanceof Resource).toBe(true);
          expect(resource.title).toEqual('10,000 BC');
        });

        it('should return null when there is no resource in the local collection with the supplied ref', () => {
          expect(resourceCollection.remove('test:doesnotexist')).toBeNull();
        });
      });

      describe('findOrCreate', () => {
        it('should return an existing Resource if it is in the local collection', () => {
          const resource = resourceCollection.findOrCreate(resourceData);
          expect(resource instanceof Resource).toBe(true);
          expect(resource.title).toEqual('10,000 BC');

          const nextResource = resourceCollection.findOrCreate(resourceCollection.collection[1]);
          expect(nextResource instanceof Resource).toBe(true);
          expect(nextResource.title).toEqual('12 Years a Slave');
        });

        it('should add the resource if it does not exist (which will also create a new one)', () => {
          jest.spyOn(resourceCollection, 'add');
          const newResourceData = {
            name: 'doesnotexist',
            title: 'Non-existant'
          };

          const resource = resourceCollection.findOrCreate(newResourceData);
          expect(resource instanceof Resource).toBe(true);
          expect(resource.title).toEqual('Non-existant');

          expect(resourceCollection.add).toHaveBeenCalled();

          // Make sure we can now find it
          expect(resourceCollection.find('test:doesnotexist')).toBeTruthy();
        });
      });

      describe('where', () => {
        it('should accept a function argument for finding by custom matchers', () => {
          expect(resourceCollection.where(r => r.title === '10,000 BC').length).toEqual(1);
        });

        it('should accept an object argument for finding by a set of key/value pairs', () => {
          expect(resourceCollection.where({ title: '10,000 BC' }).length).toEqual(1);
          expect(resourceCollection.where({ title: '10,000 BC', duration: 'PT0H0M' }).length).toEqual(1);
        });

        it('should return an empty array when it finds nothing matching', () => {
          expect(resourceCollection.where({ title: 'this does not exist' }).length).toEqual(0);
          expect(resourceCollection.where({ title: '10,000 BC', duration: 'PT0H60M' }).length).toEqual(0);
        });

        it('should return an empty array when the supplied argument is not a function, string or object', () => {
          expect(resourceCollection.where().length).toEqual(0);
          expect(resourceCollection.where(null).length).toEqual(0);
          expect(resourceCollection.where(undefined).length).toEqual(0);
          expect(resourceCollection.where(2).length).toEqual(0);
          expect(resourceCollection.where(false).length).toEqual(0);
        });

        it('should pass the ref to filter if there is a ref property in the criteria', () => {
          const criteria = {
            ref: 'sa-team:UTV-BOX-15006'
          };

          expect(resourceCollection.where(criteria)[0].rawData.ref).toEqual(criteria.ref);
        });
      });

      describe('findWhere', () => {
        it('should delegate to `where`', () => {
          jest.spyOn(resourceCollection, 'where');
          resourceCollection.findWhere({ name: 'testing' });

          expect(resourceCollection.where).toHaveBeenCalledWith(expect.objectContaining({ name: 'testing' }));
        });

        it('should return null when nothing matches', () => {
          expect(resourceCollection.findWhere({ name: 'testing' })).toBeNull();
        });

        it('should return a Resource when something is found', () => {
          const resource = resourceCollection.findWhere({ ref: 'sa-team:UTV-15162' });
          expect(resource instanceof Resource).toBe(true);
        });
      });
    });
  });
});
