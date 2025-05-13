import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Endpoint } from '@fezi/client';
import { enhanceEndpointWithQuery, createTanStackQueryAPI } from '../query.js';

// Define a minimal APIClient interface for testing
interface MockAPIClient {
  options: Record<string, any>;
  route: () => any;
  execute: () => any;
  buildUrl: () => any;
  getHeaders: () => any;
  getRequestInit: () => any;
}

// Mock Endpoint class and dependencies
vi.mock('@fezi/client', () => {
  const MockAPIClient = vi.fn().mockImplementation(() => ({
    options: {},
    route: vi.fn(),
    execute: vi.fn(),
    buildUrl: vi.fn(),
    getHeaders: vi.fn(),
    getRequestInit: vi.fn(),
  }));

  return {
    Endpoint: class MockEndpoint {
      execute = vi.fn();
      constructor(apiClient: MockAPIClient) {
        // Default mock implementation
        this.execute.mockResolvedValue({ data: 'test-data', error: null });
      }
    },
    APIClient: MockAPIClient,
  };
});

// Create mock API client
const mockApiClient = {
  options: {},
  route: vi.fn(),
  execute: vi.fn(),
  buildUrl: vi.fn(),
  getHeaders: vi.fn(),
  getRequestInit: vi.fn(),
};

describe('enhanceEndpointWithQuery', () => {
  let endpoint: Endpoint<any, any>;
  let enhancedEndpoint: ReturnType<typeof enhanceEndpointWithQuery>;

  beforeEach(() => {
    endpoint = new Endpoint(mockApiClient as any);
    enhancedEndpoint = enhanceEndpointWithQuery(endpoint, ['users', 'getAll']);
  });

  it('should enhance an endpoint with queryOptions and getKey methods', () => {
    expect(enhancedEndpoint.queryOptions).toBeDefined();
    expect(enhancedEndpoint.getKey).toBeDefined();
    expect(typeof enhancedEndpoint.queryOptions).toBe('function');
    expect(typeof enhancedEndpoint.getKey).toBe('function');
  });

  it('should generate correct query key using getKey method', () => {
    const keyWithoutParams = enhancedEndpoint.getKey();
    expect(keyWithoutParams).toEqual(['users', 'getAll']);

    const keyWithParams = enhancedEndpoint.getKey({ id: 123 });
    expect(keyWithParams).toEqual(['users', 'getAll', { id: 123 }]);
  });

  it('should return queryOptions with correct structure', () => {
    const options = enhancedEndpoint.queryOptions();

    expect(options.queryKey).toEqual(['users', 'getAll']);
    expect(options.queryFn).toBeDefined();
    expect(typeof options.queryFn).toBe('function');
  });

  it('should use custom query key when provided', () => {
    const customKey = ['custom', 'key'] as const;
    const options = enhancedEndpoint.queryOptions({ queryKey: customKey });

    expect(options.queryKey).toEqual(customKey);
  });

  it('should pass additional options to the returned query options', () => {
    const options = enhancedEndpoint.queryOptions({
      staleTime: 5000,
      cacheTime: 10000,
    });

    expect(options.staleTime).toBe(5000);
    expect(options.cacheTime).toBe(10000);
  });

  it('should pass input and urlParams to endpoint.execute when query function is called', async () => {
    const options = enhancedEndpoint.queryOptions({
      input: { name: 'test' },
      urlParams: { id: '123' },
    });

    await options.queryFn({ queryKey: options.queryKey } as any);

    expect(endpoint.execute).toHaveBeenCalledWith({ name: 'test' }, { id: '123' });
  });

  it('should throw an error when endpoint returns an error', async () => {
    // Setup endpoint to return an error
    (endpoint.execute as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Test error', status: 400 },
    });

    const options = enhancedEndpoint.queryOptions();

    await expect(options.queryFn({ queryKey: options.queryKey } as any)).rejects.toThrow(
      'Test error'
    );
  });
});

describe('createTanStackQueryAPI', () => {
  it('should transform a router object into a TanStackQueryRouter', () => {
    const mockEndpoint = new Endpoint(mockApiClient as any);
    const router = {
      users: {
        getAll: mockEndpoint,
        getById: mockEndpoint,
      },
      posts: {
        getAll: mockEndpoint,
        comments: {
          getAll: mockEndpoint,
        },
      },
    };

    const api = createTanStackQueryAPI(router);

    // Check structure
    expect(api.users.getAll.queryOptions).toBeDefined();
    expect(api.users.getById.queryOptions).toBeDefined();
    expect(api.posts.getAll.queryOptions).toBeDefined();
    expect(api.posts.comments.getAll.queryOptions).toBeDefined();

    // Check query keys
    expect(api.users.getAll.getKey()).toEqual(['users', 'getAll']);
    expect(api.posts.comments.getAll.getKey()).toEqual(['posts', 'comments', 'getAll']);
  });

  it('should handle empty objects', () => {
    const api = createTanStackQueryAPI({});
    expect(api).toEqual({});
  });

  it('should skip non-endpoint and non-object properties', () => {
    const mockEndpoint = new Endpoint(mockApiClient as any);
    const router = {
      users: {
        getAll: mockEndpoint,
        // @ts-ignore - Adding invalid property for test
        count: 100,
      },
    };

    const api = createTanStackQueryAPI(router as any);

    expect(api.users.getAll.queryOptions).toBeDefined();
    // @ts-ignore - Checking that non-endpoint is preserved
    expect(api.users.count).toBe(100);
  });
});
