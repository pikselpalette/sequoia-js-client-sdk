import Resource, { NO_RESOURCEFUL_ENDPOINT_ERROR, ValidationError } from '../../lib/resource.js';
import ResourcefulEndpoint from '../../lib/resourceful_endpoint.js';
import Transport from '../../lib/transport.js';
import metadataDescriptorFixture from '../fixtures/metadata-descriptor.json';
import assetFixture from '../fixtures/image-asset.json';
import categoryFixture from '../fixtures/comedy-category.json';

const contentsDescriptor = Object.assign(metadataDescriptorFixture.resourcefuls.contents, {
  location: 'http://localhost/metadata',
  tenant: 'test'
});

const assetsDescriptor = Object.assign(metadataDescriptorFixture.resourcefuls.assets, {
  location: 'http://localhost/metadata',
  tenant: 'test'
});

const categoriesDescriptor = Object.assign(metadataDescriptorFixture.resourcefuls.categories, {
  location: 'http://localhost/metadata',
  tenant: 'test'
});

const resourcefulEndpoint = new ResourcefulEndpoint(new Transport(), contentsDescriptor);
const content = {
  ref: 'test:ref',
  owner: 'test',
  name: 'ref',
  title: 'Test title',
  fields: [
    'fieldA',
    'fieldB'
  ],
  mediumSynopsis: 'Medium synopsis',
  availabilityEndAt: '2017-12-31T00:00:00.000Z',
  duration: 'PT0H2M',
  type: 'clip',
  ratings: {
    BBFC: '15'
  }
};

const parentContent = {
  ref: 'test:parent-ref',
  owner: 'test',
  name: 'parent-ref',
  title: 'Test parent title',
  mediumSynopsis: 'Medium parent synopsis',
  availabilityEndAt: '2017-12-31T00:00:00.000Z',
  duration: 'PT0H2M',
  ratings: {
    BBFC: '15'
  }
};

describe('Resource', () => {
  let resource;

  describe('without a resourcefulEndpoint', () => {
    beforeEach(() => {
      resource = new Resource(content);
    });

    describe('toJSON', () => {
      it('should return the initial JSON', () => {
        const json = resource.toJSON();

        expect(json).toEqual(expect.objectContaining(content));
      });
    });

    describe('save', () => {
      it('should reject with an error message as there is no endpoint to save to', async () =>
        expect(resource.save()).rejects.toEqual(NO_RESOURCEFUL_ENDPOINT_ERROR));
    });

    describe('destroy', () => {
      it('should reject with an error message as there is no endpoint to delete to', async () =>
        expect(resource.destroy()).rejects.toEqual(NO_RESOURCEFUL_ENDPOINT_ERROR));
    });
  });

  describe('with a resourcefulEndpoint', () => {
    beforeEach(() => {
      resource = new Resource(content, resourcefulEndpoint);
    });

    describe('toJSON', () => {
      it('should return the fields from the descriptor with any defaults', () => {
        const json = resource.toJSON();

        expect(json).toEqual(expect.objectContaining({ ref: 'test:ref', active: true }));
      });
    });

    describe('save', () => {
      it('should PUT an existing resource and resolve', async () => {
        jest.spyOn(resource.resourcefulEndpoint, 'update').mockImplementation(() => Promise.resolve());

        await expect(resource.save()).resolves.toBeFalsy();
        expect(resource.resourcefulEndpoint.update).toHaveBeenCalledWith(resource);
      });

      it('should POST a new resource and resolve', async () => {
        jest.spyOn(resource.resourcefulEndpoint, 'store').mockImplementation(() => Promise.resolve());

        resource.is_new = true;

        await expect(resource.save()).resolves.toBeFalsy();
        expect(resource.resourcefulEndpoint.store).toHaveBeenCalledWith(resource);
      });
    });

    describe('destroy', () => {
      it('should DELETE an existing resource and resolve', async () => {
        jest.spyOn(resource.resourcefulEndpoint, 'destroy').mockImplementation(() => Promise.resolve());

        await expect(resource.destroy()).resolves.toBeFalsy();
        expect(resource.resourcefulEndpoint.destroy).toHaveBeenCalledWith(resource);
      });
    });

    describe('relationships', () => {
      let asset;
      let category;

      beforeEach(() => {
        asset = new Resource(assetFixture, new ResourcefulEndpoint(new Transport(), assetsDescriptor));
        category = new Resource(categoryFixture, new ResourcefulEndpoint(new Transport(), categoriesDescriptor));
      });

      describe('getRelationshipFor', () => {
        it('should find if the link should be direct or indirect', () => {
          expect(() => resource.getRelationshipFor('NOTHING')).toThrow();
          expect(() => resource.getRelationshipFor('members')).not.toThrow();
          expect(resource.getRelationshipFor(asset)).toEqual(expect.objectContaining({ type: 'indirect' }));
          expect(resource.getRelationshipFor(category)).toEqual(expect.objectContaining({ type: 'direct' }));
        });
      });

      describe('link', () => {
        describe('direct relationship', () => {
          let parentContentResource;

          beforeEach(() => {
            parentContentResource = new Resource(parentContent, resourcefulEndpoint);
          });

          describe('that are one-to-one', () => {
            it('should create the link if none existed before', () => {
              expect(resource.parentRef).toBeUndefined();
              resource.link(parentContentResource);

              expect(resource.parentRef).toEqual(parentContentResource.ref);
            });

            it('should replace the link', () => {
              resource.link(parentContentResource);
              resource.parentRef = 'test:another-parent-ref';
              resource.link(parentContentResource);

              expect(resource.parentRef).toEqual(parentContentResource.ref);
            });
          });

          describe('that are one-to-many', () => {
            it('should create the link if none existed before', () => {
              resource.link(category);
              expect(resource.categoryRefs).toEqual([category.ref]);
            });

            it('should add the linked ref to the current resource', () => {
              resource.categoryRefs = ['test:existing-ref'];
              resource.link(category);

              expect(resource.categoryRefs).toContain(category.ref);
            });

            it('should not duplicate linked refs', () => {
              resource.link(category);
              expect(resource.categoryRefs).toContain(category.ref);

              resource.link(category);
              expect(resource.categoryRefs).toEqual([category.ref]);
            });

            it('should take a custom relationship as the "as" parameter', () => {
              resource.link(parentContentResource, 'members');
              expect(resource.memberRefs).toEqual([parentContentResource.ref]);
            });

            it('should take an array of Resources to link', () => {
              const contents = [0, 1, 2, 3].map((index) => {
                const ref = `${parentContent.ref}-${index}`;
                return new Resource(Object.assign({}, parentContent, { ref }), resourcefulEndpoint);
              });

              resource.link(contents, 'members');
              expect(resource.memberRefs.length).toEqual(4);
              expect(resource.memberRefs[3]).toEqual(contents[3].ref);
            });
          });

          it('saveIndirectLinks should immediately resolve with "undefined"', async () => {
            resource.link(category);
            expect(resource.indirectlyLinkedResources.length).toEqual(0);
            return expect(resource.saveIndirectLinks()).resolves.toEqual(undefined);
          });
        });

        describe('indirect relationship', () => {
          it('should add the linked ref to the supplied resource', () => {
            resource.link(asset);
            expect(asset.contentRef).toEqual(resource.ref);
          });

          it('should add the linked resource to the "indirectlyLinkedResources" array', () => {
            resource.link(asset);
            expect(resource.indirectlyLinkedResources.length).toEqual(1);
            expect(resource.indirectlyLinkedResources[0]).toEqual(asset);
          });

          describe('when given an array of Resources', () => {
            let assets;

            beforeEach(() => {
              const assetEndpoint = new ResourcefulEndpoint(new Transport(), assetsDescriptor);
              assets = [0, 1, 2, 3].map((index) => {
                const ref = `${assetFixture.ref}-${index}`;
                const assetResource = new Resource(Object.assign({}, assetFixture, { ref }), assetEndpoint);
                jest.spyOn(assetResource, 'save').mockImplementation(() => {});

                return assetResource;
              });

              resource.link(assets);
            });

            it('should add them to the "indirectlyLinkedResources" array', () => {
              expect(resource.indirectlyLinkedResources.length).toEqual(4);
              expect(resource.indirectlyLinkedResources[0]).toEqual(assets[0]);
            });

            it('saveIndirectLinks should call "save" on each indirect link', async () => {
              await expect(resource.saveIndirectLinks()).resolves.toBeTruthy();
              assets.forEach(a => expect(a.save).toHaveBeenCalled());
            });
          });
        });
      });
    });
  });

  describe('hasLinked', () => {
    it('should be false when there is nothing linked', () => {
      expect(resource.hasLinked('assets')).toBeFalsy();
    });

    it('should be false when there are linked items but not what was requested', () => {
      resource.linked = {
        categories: [{ ref: 'test:link' }]
      };
      expect(resource.hasLinked('assets')).toBeFalsy();
    });

    it('should be false when there is an empty link', () => {
      resource.linked = {
        assets: []
      };

      expect(resource.hasLinked('assets')).toBeFalsy();
    });

    it('should be true when there is a populated link', () => {
      resource.linked = {
        assets: [{ ref: 'test:asset-link' }],
        categories: [{ ref: 'test:category-link' }]
      };

      expect(resource.hasLinked('assets')).toBeTruthy();
      expect(resource.hasLinked('categories')).toBeTruthy();
    });
  });

  describe('validate', () => {
    it('should resolve with the resource when it is valid', async () =>
      expect(resource.validate()).resolves.toEqual(resource));

    it('should reject when the Resource is invalid', async () => {
      jest.spyOn(resource, 'validateField').mockImplementation((field) => {
        if (field === 'owner') {
          return {
            code: 1, field: 'owner', message: 'reject', valid: false
          };
        }

        return { code: 0, valid: true };
      });

      await expect(resource.validate()).rejects.toEqual(new Error(resource));
      expect(resource.errors.length).toEqual(1);
      expect(resource.errors[0]).toEqual(expect.objectContaining({ code: 1, valid: false }));
    });
  });

  describe('validateField', () => {
    let invalidResource;

    beforeEach(() => {
      const invalidContent = {
        ref: 'test:ref',
        owner: undefined,
        name: '$',
        title: 'Test title',
        mediumSynopsis: 'Medium synopsis',
        availabilityEndAt: '2017',
        duration: 'test',
        type: 'test',
        ratings: {
          TEST: '15',
          BBFC: '1'
        }
      };

      invalidResource = new Resource(invalidContent, resourcefulEndpoint);
    });

    it('should return code ValidationError.NO_FIELD when the field provided doesn\'t exist in the descriptor', () => {
      expect(invalidResource.validateField('nonexistant')).toEqual(expect.objectContaining({ code: ValidationError.NO_FIELD, valid: false }));
    });

    it('should return code ValidationError.REQUIRED_FIELD when a required field has not been provided', () => {
      expect(invalidResource.validateField('owner')).toEqual(expect.objectContaining({ code: ValidationError.REQUIRED_FIELD, valid: false }));
    });

    it('should return code ValidationError.NOT_ALLOWED when the value is not one of the allowed values', () => {
      expect(invalidResource.validateField('type')).toEqual(expect.objectContaining({ code: ValidationError.NOT_ALLOWED, valid: false }));
    });

    it('should return code ValidationError.INVALID_VALUE when the value is invalid', () => {
      expect(invalidResource.validateField('duration')).toEqual(expect.objectContaining({ code: ValidationError.INVALID_VALUE, valid: false }));
      expect(invalidResource.validateField('name')).toEqual(expect.objectContaining({ code: ValidationError.INVALID_VALUE, valid: false }));
    });

    it('should return code ValidationError.INVALID_MAP when the Map keys are incorrect', () => {
      expect(invalidResource.validateField('ratings')).toEqual(expect.objectContaining({ code: ValidationError.INVALID_MAP, valid: false }));
    });
  });
});
