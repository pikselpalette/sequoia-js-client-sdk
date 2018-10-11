import Query, { where, field, textSearch } from '../../lib/query';
import Predications from '../../lib/predications';

describe('Query', () => {
  describe('exports', () => {
    it('should be "where", "field" and "textSearch"', () => {
      expect(where).toBeDefined();
      expect(field).toBeDefined();
      expect(textSearch).toBeDefined();
    });

    describe('method "where"', () => {
      it('should return a Query with the specified criteria', () => {
        const testCriteria = 'TEST';
        const query = where(testCriteria);
        expect(query instanceof Query).toBe(true);

        expect(query.query).toEqual(testCriteria);
      });
    });

    describe('method "field"', () => {
      it('should return a Predications with the specified criteria', () => {
        const testCriteria = 'TEST';
        const queryField = field(testCriteria);
        expect(queryField instanceof Predications).toBe(true);

        expect(queryField.field).toContain(testCriteria);
      });
    });

    describe('method "textSearch"', () => {
      it('should return "q=<value>"', () => {
        const search = textSearch('TEST');

        expect(search).toEqual('q=TEST');
      });
    });
  });

  describe('instance method', () => {
    let query = null;

    beforeEach(() => {
      query = new Query();

      jest.spyOn(query, 'orderBy');
    });

    it('"and" should append the new query to the current query', () => {
      expect(query.and('test=true').query).toEqual('&test=true');
    });

    it('"count" should append "&count=true" to the query', () => {
      expect(query.count().query).toEqual('&count=true');
    });

    it('"continue" should append "&continue=true" to the query', () => {
      expect(query.continue().query).toEqual('&continue=true');
    });

    it('"lang" should append "&lang=<value>" to the query', () => {
      expect(query.lang('en').query).toEqual('&lang=en');
    });

    it('"page" should append "&page=<value>" to the query', () => {
      expect(query.page(10).query).toEqual('&page=10');
    });

    it('"perPage" should append "&perPage=<value>" to the query', () => {
      expect(query.perPage(99).query).toEqual('&perPage=99');
    });

    it('"fields" should append the supplied arguments to the query comma-separated', () => {
      expect(query.fields('one').query).toEqual('&fields=one');

      query.query = '';
      expect(query.fields('one', 'two', 'three').query).toEqual('&fields=one,two,three');
    });

    it('"include" should append the supplied arguments to the query comma-separated', () => {
      expect(query.include('one').query).toEqual('&include=one');

      query.query = '';
      expect(query.include('one', 'two', 'three').query).toEqual('&include=one,two,three');
    });

    it('"asc" should change the sortModifier property to an empty string', () => {
      expect(query.asc().sortModifier).toEqual('');
      expect(query.desc().asc().sortModifier).toEqual('');
    });

    it('"desc" should change the sortModifier property to a "-"', () => {
      expect(query.desc().sortModifier).toEqual('-');
      expect(query.asc().desc().sortModifier).toEqual('-');
    });

    it('"orderBy" should change the sort property', () => {
      expect(query.orderBy('test').sort).toEqual('test');
    });

    it('"orderByOwner" should call "orderBy" with "owner"', () => {
      query.orderByOwner();
      expect(query.orderBy).toHaveBeenCalledWith('owner');
    });

    it('"orderByName" should call "orderBy" with "name"', () => {
      query.orderByName();
      expect(query.orderBy).toHaveBeenCalledWith('name');
    });

    it('"orderByCreatedAt" should call "orderBy" with "createdAt"', () => {
      query.orderByCreatedAt();
      expect(query.orderBy).toHaveBeenCalledWith('createdAt');
    });

    it('"orderByCreatedBy" should call "orderBy" with "createdBy"', () => {
      query.orderByCreatedBy();
      expect(query.orderBy).toHaveBeenCalledWith('createdBy');
    });

    it('"orderByUpdatedAt" should call "orderBy" with "updatedAt"', () => {
      query.orderByUpdatedAt();
      expect(query.orderBy).toHaveBeenCalledWith('updatedAt');
    });

    it('"orderByUpdatedBy" should call "orderBy" with "updatedBy"', () => {
      query.orderByUpdatedBy();
      expect(query.orderBy).toHaveBeenCalledWith('updatedBy');
    });

    describe('addRelatedThroughFields', () => {
      it('leaves the query intact if passed no relationships or allField parameter', () => {
        query.query = 'fields=ref,title';
        expect(query.addRelatedThroughFields().query).toEqual('fields=ref,title');
      });

      it('leaves the query intact if a non-through relationship is passed anat the relationship is included in the query', () => {
        const relationships = {
          throughRelationship: {
            through: 'relatedThrough'
          },
          relatedThrough: {
            fieldNamePath: 'throughField'
          }
        };
        query.query = '&fields=ref,title&include=relatedThrough';
        expect(query.addRelatedThroughFields(relationships).query).toEqual('fields=ref,title&include=relatedThrough');
      });

      it('appends the through related field to the query if a through relationship is passed and that relationship is included in the query', () => {
        const relationships = {
          throughRelationship: {
            through: 'relatedThrough'
          },
          relatedThrough: {
            fieldNamePath: 'throughField'
          }
        };
        query.query = '&fields=ref,title&include=throughRelationship';
        expect(query.addRelatedThroughFields(relationships).query).toEqual('fields=ref,title,throughField&include=throughRelationship');
      });

      it('preserves nested query parts', () => {
        const relationships = {
          throughRelationship: {
            through: 'relatedThrough'
          },
          relatedThrough: {
            fieldNamePath: 'throughField'
          }
        };
        query.query = '&fields=ref,title&include=throughRelationship&relatedThrough.withTags=someTag';
        expect(query.addRelatedThroughFields(relationships).query).toEqual('fields=ref,title,throughField&include=throughRelationship&relatedThrough.withTags=someTag');
      });

      describe('when there are no fields on the query, a through relationship is passed and that relationship is included in the query', () => {
        it('appends allFields to the query', () => {
          const relationships = {
            throughRelationship: {
              through: 'relatedThrough'
            },
            relatedThrough: {
              fieldNamePath: 'throughField'
            }
          };

          const allFields = [
            'ref',
            'title',
            'createdAt',
            'updatedAt'
          ];

          query.query = 'include=throughRelationship';
          expect(query.addRelatedThroughFields(relationships, allFields).query)
            .toEqual('include=throughRelationship&fields=ref,title,createdAt,updatedAt,throughField');
        });
      });
    });

    describe('"toQueryString"', () => {
      it('should not append sorting if no sort was set', () => {
        expect(query.toQueryString()).toEqual('');
      });

      it('should append sorting if a sort was set', () => {
        expect(query.orderBy('test').toQueryString()).toEqual('&sort=test');
        expect(query.orderBy('test').desc().toQueryString()).toEqual('&sort=-test');
      });

      it('should return the query property in the order called with applied sorting at the end', () => {
        const queryOptions = '&fields=type,title,mediumSynopsis,availabilityStartAt,availabilityEndAt,duration,ref,title'
          + '&include=assets&page=1&perPage=24&count=true&sort=-updatedAt';
        const fluentQuery = where()
          .fields('type', 'title', 'mediumSynopsis', 'availabilityStartAt', 'availabilityEndAt', 'duration', 'ref', 'title')
          .include('assets')
          .page(1)
          .perPage(24)
          .orderByUpdatedAt()
          .desc()
          .count();

        expect(fluentQuery.toQueryString()).toEqual(queryOptions);
      });
    });
  });
});
