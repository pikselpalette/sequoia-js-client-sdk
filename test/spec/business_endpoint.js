import fetchMock from 'fetch-mock';
import BusinessEndpoint, { InvalidCriteriaException } from '../../lib/business_endpoint.js';
import Transport from '../../lib/transport.js';
import { param, where } from '../../lib/query.js';
import gatewayDescriptorFixture from '../fixtures/gateway-descriptor.json';
import paymentDescriptorFixture from '../fixtures/payment-descriptor.json';

describe('InvalidCriteriaException', () => {
  it('should change the message and name when called', () => {
    const result = new InvalidCriteriaException('Dave');
    expect(result.message).toEqual('Dave');
    expect(result.name).toEqual('InvalidCriteriaException');
  });
});

describe('BusinessEndpoint', () => {
  // GET with no required query parameters, but does have required path parameters
  const gatewayEndpoint = Object.assign({
    location: 'http://localhost',
    tenant: 'testtenant'
  }, gatewayDescriptorFixture.routes[2]);

  // GET with required query parameters and no required path parameters
  const paymentEndpoint = Object.assign({
    location: 'http://localhost',
    tenant: 'testtenant'
  }, paymentDescriptorFixture.routes[3]);

  // POST with no required query parameters and no required path parameters
  const postPaymentEndpoint = Object.assign({
    location: 'http://localhost',
    tenant: 'testtenant'
  }, paymentDescriptorFixture.routes[5]);

  let transport;
  let gateway;
  let payment;
  let postPayment;

  beforeEach(() => {
    transport = new Transport();
    gateway = new BusinessEndpoint(transport, gatewayEndpoint, { name: 'testname' });
    payment = new BusinessEndpoint(transport, paymentEndpoint);
    postPayment = new BusinessEndpoint(transport, postPaymentEndpoint);
    fetchMock.mock('*', { test: 'success' });
  });

  afterEach(fetchMock.restore);

  describe('constructor', () => {
    it('should throw when the path options don\'t match', () => {
      expect(() => new BusinessEndpoint(transport, gatewayEndpoint)).toThrowError('Required path parameter \'name\' was not supplied');
    });

    // xit('should not throw when the path options do match', () => {
    //   expect(() => new BusinessEndpoint(transport, gatewayEndpoint, { name: 'testname' })).not.toThrow();
    // });

    it('should default path parameter "owner" to the supplied tenant', () => {
      const businessEndpoint = new BusinessEndpoint(transport, gatewayEndpoint, { name: 'testname' });

      // No required query string params
      expect(() => businessEndpoint.endPointUrl()).not.toThrow();
      expect(businessEndpoint.endPointUrl()).toMatch(/testtenant\/testname$/);
    });
  });

  describe('requiredQueryParameters', () => {
    it('should return an array of required query parameter names', () => {
      expect(gateway.requiredQueryParameterNames.length).toEqual(0);
      expect(payment.requiredQueryParameterNames.length).toEqual(1);
      expect(payment.requiredQueryParameterNames).toContain('currency');

      expect(postPayment.requiredQueryParameterNames.length).toEqual(0);
    });
  });

  describe('endpointUrl', () => {
    it('should throw InvalidCriteriaException when required query parameters are not passed', () => {
      const businessEndpoint = new BusinessEndpoint(transport, paymentEndpoint);

      expect(() => businessEndpoint.endPointUrl()).toThrow(InvalidCriteriaException);
    });

    it('should throw InvalidCriteriaException when required query parameters are passed an empty string', () => {
      const businessEndpoint = new BusinessEndpoint(transport, paymentEndpoint);

      expect(() => businessEndpoint.endPointUrl('')).toThrow(InvalidCriteriaException);
    });

    it('should not throw InvalidCriteriaException when required query parameters are passed', () => {
      const businessEndpoint = new BusinessEndpoint(transport, paymentEndpoint);

      expect(() => businessEndpoint.endPointUrl('currency=GBP')).not.toThrow();
      expect(businessEndpoint.endPointUrl('currency=GBP')).toMatch(/payment\/token\?currency=GBP$/);
    });

    it('should accept a Query instance', () => {
      const businessEndpoint = new BusinessEndpoint(transport, paymentEndpoint);
      const query = where(param('currency').equalTo('GBP'));

      expect(() => businessEndpoint.endPointUrl(query)).not.toThrow();
      expect(businessEndpoint.endPointUrl(query)).toMatch(/payment\/token\?currency=GBP$/);
    });
  });

  describe('fetch', () => {
    it('should make a `fetch` request with the method of the endpoint', async () => {
      await gateway.fetch();
      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'GET' }));

      await postPayment.fetch();
      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'POST' }));
    });
  });
});
