/**
 * A fluent interace for creating queries against resourceful endpoints
 * <p>It is not intended that this class will be used on its own by end users.
 * Instead, require it from {@link Query} as in the below example.
 *
 * @param {string} field - The field name to set criteria against
 *
 * @example
 * import { where, field } from '@pikselpalette/sequoia-js-client-sdk/lib/query';
 *
 * where(field('title').notEqualTo('foo')).and(field("startedAt").lessThan("2014"))
 */
class Predications {
  constructor(field, raw = false) {
    if (raw) {
      this.field = field;
    } else {
      this.field = `with${field.charAt(0).toUpperCase()}${field.slice(1)}`;
    }
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=value`
   *
   * @param {string} value - value for this predicate
   *
   * @example
   * field('engine').equalTo('diesel'); // returns 'engine=diesel'
   *
   * @returns {string}
   */
  equalTo(value) {
    return `${this.field}=${value}`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=!value`
   *
   * @param {string} value - value for this predicate
   *
   * @example
   * field('engine').notEqualTo('diesel'); // returns 'engine=!diesel'
   *
   * @returns {string}
   */
  notEqualTo(value) {
    return `${this.field}=!${value}`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=value1||value2`
   *
   * @param {...string} value - value(s) for this predicate
   *
   * @example
   * field('engine').oneOrMoreOf('diesel', 'petrol'); // returns 'engine=diesel||petrol'
   *
   * @returns {string}
   */
  oneOrMoreOf(...value) {
    return `${this.field}=${value.join('||')}`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=value*`
   *
   * @param {string} value - value for this predicate
   *
   * @example
   * field('engine').startsWith('diesel'); // returns 'engine=diesel*'
   *
   * @returns {string}
   */
  startsWith(value) {
    return `${this.field}=${value}*`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=*`
   *
   * @example
   * field('engine').exists(); // returns 'engine=*'
   *
   * @returns {string}
   */
  exists() {
    return `${this.field}=*`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=!*`
   *
   * @example
   * field('engine').notExists(); // returns 'engine=!*'
   *
   * @returns {string}
   */
  notExists() {
    return `${this.field}=!*`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=start/end`
   *
   * @param {(string|number)} start - start value for this predicate
   * @param {(string|number)} end - end value for this predicate
   *
   * @example
   * field('startedAt').between('2014', '2015'); // returns 'startedAt=2014/2015'
   *
   * @returns {string}
   */
  between(start, end) {
    return `${this.field}=${start}/${end}`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=!start/end`
   *
   * @param {(string|number)} start - start value for this predicate
   * @param {(string|number)} end - end value for this predicate
   *
   * @example
   * field('startedAt').notBetween('2014', '2015'); // returns 'startedAt=!2014/2015'
   *
   * @returns {string}
   */
  notBetween(start, end) {
    return `${this.field}=!${start}/${end}`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=!value/`
   *
   * @param {(string|number)} value - value for this predicate
   *
   * @example
   * field('startedAt').lessThan(2015); // returns 'engine=!2015/'
   *
   * @returns {string}
   */
  lessThan(value) {
    return `${this.field}=!${value}/`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=/value`
   *
   * @param {(string|number)} value - value for this predicate
   *
   * @example
   * field('startedAt').lessThanOrEqualTo(2015); // returns 'startedAt=/2015'
   *
   * @returns {string}
   */
  lessThanOrEqualTo(value) {
    return `${this.field}=/${value}`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=!/value`
   *
   * @param {(string|number)} value - value for this predicate
   *
   * @example
   * field('startedAt').greaterThan(2015); // returns 'startedAt=!/2015'
   *
   * @returns {string}
   */
  greaterThan(value) {
    return `${this.field}=!/${value}`;
  }

  /**
   * Generates a url encoded criteria expression equivalent to: `field=value/`
   *
   * @param {(string|number)} value - value for this predicate
   *
   * @example
   * field('startedAt').greaterThanOrEqualTo(2015); // returns 'startedAt=2015/'
   *
   * @returns {string}
   */
  greaterThanOrEqualTo(value) {
    return `${this.field}=${value}/`;
  }
}

export default Predications;
