import fetchMock from 'fetch-mock';
import Transport from '../../lib/transport';

describe('transport', () => {
  afterEach(fetchMock.restore);

  let transport;

  beforeEach(() => {
    transport = new Transport();
  });

  afterEach(() => {
    fetchMock.restore();
    transport = undefined;
  });

  it('should export', () => {
    expect(transport.get).toBeDefined();
    expect(transport.post).toBeDefined();
    expect(transport.put).toBeDefined();
    expect(transport.destroy).toBeDefined();
    expect(transport.defaults).toBeDefined();
  });

  describe('fetchWithDefaults', () => {
    it('should return the response as JSON', async () => {
      fetchMock.mock('/', {
        body: { test: 'response' }
      });

      return expect(transport.get('/')).resolves.toEqual(expect.objectContaining({ test: 'response' }));
    });

    it('should return an empty object when the respinse is a 204', async () => {
      fetchMock.mock('/', 204);

      return expect(transport.get('/')).resolves.toEqual(expect.objectContaining({}));
    });

    it('should reject with HTTP errors', async () => {
      fetchMock.mock('/', {
        status: 500,
        body: { message: 'test message' }
      });

      return expect(transport.get('/')).rejects.toEqual({
        asymmetricMatch: actual => actual.response.ok === false
          && actual instanceof Error
          && actual.message === 'test message'
      });
    });

    it('should reject with statusText when response.json() promise is rejected', async () => {
      const response = new Response(null, { status: 500, statusText: 'status text' });
      response.json = () => Promise.reject();

      fetchMock.mock('/', response);

      return expect(transport.get('/')).rejects.toEqual({
        asymmetricMatch: actual => actual.response.ok === false
          && actual instanceof Error
          && actual.message === 'status text'
      });
    });

    it('should reject on non-JSON responses', async () => {
      fetchMock.mock('/', { body: '<html>this is not json</html>' });

      return expect(transport.get('/')).rejects.toEqual(expect.any(Object));
    });

    it('should not encode request url when encodeUri not set', async () => {
      fetchMock.mock('/%20|é%@', {
        body: { test: 'response' }
      });

      return expect(transport.get('/%20|é%@')).resolves.toEqual(expect.objectContaining({ test: 'response' }));
    });

    it('should encode request url when encodeUri set', async () => {
      // Only should encode unsafe chars, and should not double-encode already encoded sequences
      transport = new Transport({}, true);

      fetchMock.mock('/%20%7C%C3%A9%25@', {
        body: { test: 'response' }
      });

      return expect(transport.get('/%20|é%@')).resolves.toEqual(expect.objectContaining({ test: 'response' }));
    });
  });

  describe('public method', () => {
    const testOptions = { test: 'header' };
    beforeEach(() => fetchMock.mock('/', { test: 'response' }));

    it('"get" should not set a "method" in its options', async () => {
      await expect(transport.get('/')).resolves.toEqual(expect.any(Object));

      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'GET' }));
    });

    it('"get" should send its options hash to "fetchWithDefaults"', async () => {
      await expect(transport.get('/', testOptions)).resolves.toEqual(expect.any(Object));

      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining(testOptions));
    });

    it('"get" should merge its options whith new ones when sent', async () => {
      jest.spyOn(global, 'fetch');
      await transport.get('/', { headers: { 'Content-Type': 'newValue' } });
      const expected = { headers: { Accept: 'application/json', 'Content-Type': 'newValue' }, method: 'GET', mode: 'cors' };
      expect(fetch).toHaveBeenCalledWith('/', expected);
    });

    it('"post" should set "method" in its options to "POST"', async () => {
      await expect(transport.post('/')).resolves.toEqual(expect.any(Object));

      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'POST' }));
    });

    it('"post" should send its options hash to "fetchWithDefaults"', async () => {
      await expect(transport.post('/', testOptions)).resolves.toEqual(expect.any(Object));

      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining(testOptions));
    });

    it('"put" should set "method" in its options to "PUT"', async () => {
      await expect(transport.put('/')).resolves.toEqual(expect.any(Object));

      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining({ method: 'PUT' }));
    });

    it('"put" should send its options hash to "fetchWithDefaults"', async () => {
      await expect(transport.put('/', testOptions)).resolves.toEqual(expect.any(Object));

      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining(testOptions));
    });

    it('"destroy" should set "method" in its options to "DELETE"', async () => {
      await expect(transport.destroy('/')).resolves.toEqual(expect.any(Object));

      expect(fetchMock.lastOptions())
        .toEqual(expect.objectContaining({ method: 'DELETE' }));
    });

    it('"destroy" should send its options hash to "fetchWithDefaults"', async () => {
      await transport.destroy('/', testOptions);
      expect(fetchMock.lastOptions()).toEqual(expect.objectContaining(testOptions));
    });
  });
});
