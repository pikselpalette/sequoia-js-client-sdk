import queryString from 'qs';
import Predications from './predications';

/**
 * A fluent interace for creating queries against resourceful endpoints
 *
 * @param {string?} query - (private) Initial query string to append to.
 * @param {string?} sort - (private) What to sort the query on
 * @param {string} [sortModifier=''] - (private) Sort modifier. Either empty string or '-'
 *
 * @requires {@link Predications}
 *
 * @example
 * import { where, field } from '@pikselpalette/sequoia-js-client-sdk/lib/query';
 *
 * endpoint.browse(where(field('startedAt').greaterThanOrEqualTo(2015))
 *                 .and(field('tags').equalTo('showcase'))
 *                 .fields('title', 'mediumSynopsis','duration', 'ref')
 *                 .include('assets').perPage(24).orderByUpdatedAt().desc().count())
 *         .then(json => { ... });
 *
 */
class Query {
  constructor(query) {
    this.query = query || '';
    this.sort = null;
    this.sortModifier = '';
  }

  /**
   * Concatenate a new query with the previous one
   *
   * @param {string} query - A query string to append (without leading ampersand).
   * Usually returned from a call to `field`
   *
   * @example
   * where(field('startedAt').greaterThanOrEqualTo(2015))
   * .and(field('tags').equalTo('showcase'))
   *
   * @since 0.0.2
   *
   * @returns {Query}
   */
  and(query) {
    this.query += `&${query}`;
    return this;
  }

  /**
   * Will return `totalCount` on the payload
   *
   * @returns {Query}
   */
  count() {
    this.query += '&count=true';
    return this;
  }

  /**
   * Appends `continue=true` to the query to initiate continuation paging
   *
   * @returns {Query}
   */
  continue() {
    this.query += '&continue=true';
    return this;
  }

  /**
   * Appends `include=value1,value2` to the query
   *
   * @param {...string} includes - includes(s) (linked resources) to return in the json response
   *
   * @example
   * where().include('assets', 'categories')
   * // appends `include=assets,categories` to the query
   *
   * @returns {Query}
   */
  include(...includes) {
    this.query += `&include=${includes.join(',')}`;
    return this;
  }

  /**
   * Appends `lang=value` to the query
   *
   * @param {string} value - ISO 639-1 code for the language you want results returned in
   *
   * @example
   * where().lang('de')
   * // appends `lang=de` to the query
   *
   * @returns {Query}
   */
  lang(value) {
    this.query += `&lang=${value}`;
    return this;
  }

  /**
   * Appends `fields=value1,value2` to the query
   *
   * @param {...string} fieldName - field(s) to return in the json response
   *
   * @example
   * where().fields('title', 'mediumSynopsis','duration', 'ref')
   * // appends `fields=title,mediumSynopsis,duration,ref` to the query
   *
   * @returns {Query}
   */
  fields(...fieldName) {
    this.query += `&fields=${fieldName.join(',')}`;
    return this;
  }

  /**
   * Appends `perPage=value` to the query
   *
   * @param {(string|number)} value - how many items to return per page of results
   *
   * @example
   * where().perPage(24)
   * // appends `perPage=24` to the query
   *
   * @returns {Query}
   */
  perPage(value) {
    this.query += `&perPage=${value}`;
    return this;
  }

  /**
   * Set order to ascending
   *
   * @returns {Query}
   */
  asc() {
    this.sortModifier = '';
    return this;
  }

  /**
   * Set order to descending
   *
   * @returns {Query}
   */
  desc() {
    this.sortModifier = '-';
    return this;
  }

  /**
   * Appends `sort=[-]fieldName` to the query, where `[-]` is toggled
   * depending on the call to {@link Query#asc} or {@link Query#desc}
   *
   * @see {@link Query#orderBy}
   *
   * @returns {Query}
   */
  orderBy(fieldName) {
    this.sort = fieldName;
    return this;
  }

  /**
   * Look through the relationships of a criteria, and include fields from through
   * relationships - this makes it so that the end user shouldn't know or care that
   * through relationships exist.
   *
   * @param {relationships} relationships - The relationship definitions that may
   * require the addition of fields to support the graphical display of a through relationship
   *
   * @returns {Query}

   */
  addRelatedThroughFields(relationships = {}, allFields = []) {
    const parsedQueryString = queryString.parse(this.query, {
      ignoreQueryPrefix: true,
      allowDots: true
    });
    const includes = Object.keys(parsedQueryString).includes('include')
      ? parsedQueryString.include.split(',')
      : [];
    let fields = Object.keys(parsedQueryString).includes('fields')
      ? parsedQueryString.fields.split(',')
      : [];

    const filteredIncludes = includes
      .map((include) => {
        const { through } = relationships[include] || '';
        const throughRelationship = relationships[through] || {};

        return throughRelationship.fieldNamePath || false;
      })
      .filter(fieldNamePath => fieldNamePath);

    fields = filteredIncludes.length
      ? (fields.length ? fields : allFields).concat(filteredIncludes)
      : fields;

    parsedQueryString.fields = fields.length ? fields.join(',') : undefined;

    this.query = queryString.stringify(parsedQueryString, { encode: false, allowDots: true, indices: false });
    return this;
  }

  /**
   * Convenience method for ordering by 'owner'
   *
   * @see {@link Query#orderBy}
   *
   * @returns {Query}
   */
  orderByOwner() {
    return this.orderBy('owner');
  }

  /**
   * Convenience method for ordering by 'name'
   *
   * @see {@link Query#orderBy}
   *
   * @returns {Query}
   */
  orderByName() {
    return this.orderBy('name');
  }

  /**
   * Convenience method for ordering by 'createdAt'
   *
   * @see {@link Query#orderBy}
   *
   * @returns {Query}
   */
  orderByCreatedAt() {
    return this.orderBy('createdAt');
  }

  /**
   * Convenience method for ordering by 'createdBy'
   *
   * @see {@link Query#orderBy}
   *
   * @returns {Query}
   */
  orderByCreatedBy() {
    return this.orderBy('createdBy');
  }

  /**
   * Convenience method for ordering by 'updatedAt'
   *
   * @see {@link Query#orderBy}
   *
   * @returns {Query}
   */
  orderByUpdatedAt() {
    return this.orderBy('updatedAt');
  }

  /**
   * Convenience method for ordering by 'updatedBy'
   *
   * @see {@link Query#orderBy}
   *
   * @returns {Query}
   */
  orderByUpdatedBy() {
    return this.orderBy('updatedBy');
  }

  /**
   * Turn the current Query into a string representation of a URI query
   *
   * @returns {string}
   */
  toQueryString() {
    let { query } = this;

    if (this.sort) {
      query += `&sort=${this.sortModifier}${this.sort}`;
    }

    return query;
  }
}

export default Query;

export function where(criteria) {
  return new Query(criteria);
}

export function field(value) {
  return new Predications(value);
}

export function param(value) {
  return new Predications(value, true);
}

export function textSearch(value) {
  return `q=${value}`;
}
