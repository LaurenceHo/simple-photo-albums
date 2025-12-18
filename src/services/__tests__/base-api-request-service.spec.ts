import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseApiRequestService } from '../base-api-request-service';

global.fetch = vi.fn();

class MockHeaders {
  private headers: Record<string, string> = {};

  constructor(init?: Record<string, string>) {
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers[key.toLowerCase()] = value;
      });
    }
  }

  append(name: string, value: string) {
    this.headers[name] = value;
  }

  get(name: string) {
    return this.headers[name];
  }
}

class MockFormData {
  private data: Record<string, any> = {};

  append(name: string, value: any) {
    this.data[name] = value;
  }

  get(name: string) {
    return this.data[name];
  }
}

global.Headers = MockHeaders as any;
global.FormData = MockFormData as any;

describe('BaseApiRequestService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global.fetch as Mock).mockClear();
  });

  it('should make a GET request with correct options', async () => {
    const url = 'https://api.example.com/data';
    await BaseApiRequestService.perform('GET', url);

    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
      headers: expect.any(Object),
    });
  });

  it('should make a POST request with JSON body', async () => {
    const url = 'https://api.example.com/data';
    const body = { key: 'value' };
    await BaseApiRequestService.perform('POST', url, body);

    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
      headers: expect.any(Object),
      body: JSON.stringify(body),
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledHeaders = (fetch as Mock).mock.calls[0]![1].headers as MockHeaders;
    expect(calledHeaders.get('Content-Type')).toBe('application/json');
  });

  it('should make a PUT request with URL-encoded params', async () => {
    const url = 'https://api.example.com/data';
    const params = { key: 'value' };
    await BaseApiRequestService.perform('PUT', url, null, params);

    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'PUT',
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
      headers: expect.any(Object),
      body: expect.any(URLSearchParams),
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledHeaders = (fetch as Mock).mock.calls[0]![1].headers as MockHeaders;
    expect(calledHeaders.get('Content-Type')).toBe('application/x-www-form-urlencoded');
  });

  it('should make a POST request with form data', async () => {
    const url = 'https://api.example.com/upload';
    const formParams = { file: new Blob(['test'], { type: 'text/plain' }) };
    await BaseApiRequestService.perform('POST', url, null, null, formParams);

    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
      headers: expect.any(Object),
      body: expect.any(FormData),
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledBody = (fetch as Mock).mock.calls[0]![1].body as MockFormData;
    expect(calledBody.get('file')).toEqual(formParams.file);
  });

  it('should make a request without a body when no params are provided', async () => {
    const url = 'https://api.example.com/data';
    await BaseApiRequestService.perform('GET', url);

    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
      headers: expect.any(Object),
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as Mock).mock.calls[0]![1]).not.toHaveProperty('body');
  });

  it('should convert method to uppercase', async () => {
    const url = 'https://api.example.com/data';
    await BaseApiRequestService.perform('get', url);

    expect(fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('should set Accept header to */*', async () => {
    const url = 'https://api.example.com/data';
    await BaseApiRequestService.perform('GET', url);

    expect(fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(MockHeaders),
      }),
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledHeaders = (fetch as Mock).mock.calls[0]![1].headers as MockHeaders;
    expect(calledHeaders.get('accept')).toBe('*/*');
  });

  it('should handle empty objects for params', async () => {
    const url = 'https://api.example.com/data';
    await BaseApiRequestService.perform('POST', url, {}, {}, {});

    expect(fetch).toHaveBeenCalledWith(url, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      cache: 'no-cache',
      headers: expect.any(Object),
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as Mock).mock.calls[0]![1]).not.toHaveProperty('body');
  });
});
