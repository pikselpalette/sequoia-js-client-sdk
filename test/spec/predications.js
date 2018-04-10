import Predications from '../../lib/predications';

describe('Predications', () => {
  it('should camelCase the supplied field with a "with" prefix', () => {
    expect((new Predications('test')).field).toEqual('withTest');
    expect((new Predications('t')).field).toEqual('withT');
    expect((new Predications('T')).field).toEqual('withT');
    expect((new Predications('1')).field).toEqual('with1');
  });

  describe('instance method', () => {
    let predications = null;

    beforeEach(() => {
      predications = new Predications('test');
    });

    it('"equalTo" should return "field=value"', () => {
      expect(predications.equalTo('true')).toEqual('withTest=true');
    });

    it('"notEqualTo" should return "field=!value"', () => {
      expect(predications.notEqualTo('true')).toEqual('withTest=!true');
    });

    it('"oneOrMoreOf" should return "field=value1||value2"', () => {
      expect(predications.oneOrMoreOf('one')).toEqual('withTest=one');
      expect(predications.oneOrMoreOf('one', 'two', 'three')).toEqual('withTest=one||two||three');
    });

    it('"startsWith" should return "field=value*"', () => {
      expect(predications.startsWith('value')).toEqual('withTest=value*');
    });

    it('"exists" should return "field=*"', () => {
      expect(predications.exists()).toEqual('withTest=*');
    });

    it('"notExists" should return "field=!*"', () => {
      expect(predications.notExists()).toEqual('withTest=!*');
    });

    it('"between" should return "field=start/end"', () => {
      expect(predications.between(2014, 2015)).toEqual('withTest=2014/2015');
    });

    it('"notBetween" should return "field=!start/end"', () => {
      expect(predications.notBetween(2014, 2015)).toEqual('withTest=!2014/2015');
    });

    it('"lessThan" should return "field=!value/"', () => {
      expect(predications.lessThan(2015)).toEqual('withTest=!2015/');
    });

    it('"lessThanOrEqualTo" should return "field=/value"', () => {
      expect(predications.lessThanOrEqualTo(2015)).toEqual('withTest=/2015');
    });

    it('"greaterThan" should return "field=!/value"', () => {
      expect(predications.greaterThan(2015)).toEqual('withTest=!/2015');
    });

    it('"greaterThanOrEqualTo" should return "field=value/"', () => {
      expect(predications.greaterThanOrEqualTo(2015)).toEqual('withTest=2015/');
    });
  });
});
