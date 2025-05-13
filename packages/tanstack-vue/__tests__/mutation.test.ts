import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Endpoint } from '@fezi/client';
import { enhanceEndpointWithMutation, createTanStackMutationAPI } from '../src/mutation.js';

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

describe('enhanceEndpointWithMutation', () => {
  let endpoint: Endpoint<any, any>;
  let enhancedEndpoint: ReturnType<typeof enhanceEndpointWithMutation>;

  beforeEach(() => {
    endpoint = new Endpoint(mockApiClient as any);
    enhancedEndpoint = enhanceEndpointWithMutation(endpoint, ['users', 'create']);
  });

  it('should enhance an endpoint with mutationOptions method', () => {
    expect(enhancedEndpoint.mutationOptions).toBeDefined();
    expect(typeof enhancedEndpoint.mutationOptions).toBe('function');
  });

  it('should return mutationOptions with correct structure', () => {
    const options = enhancedEndpoint.mutationOptions();

    expect(options.mutationFn).toBeDefined();
    expect(typeof options.mutationFn).toBe('function');
  });

  it('should pass additional options to the returned mutation options', () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const options = enhancedEndpoint.mutationOptions({
      onSuccess,
      onError,
      retry: 3,
    });

    expect(options.onSuccess).toBe(onSuccess);
    expect(options.onError).toBe(onError);
    expect(options.retry).toBe(3);
  });

  it('should pass variables and urlParams to endpoint.execute when mutation function is called', async () => {
    const variables = { name: 'test' };
    const options = enhancedEndpoint.mutationOptions({
      urlParams: { id: '123' },
    });

    await options.mutationFn(variables);

    expect(endpoint.execute).toHaveBeenCalledWith(variables, { id: '123' });
  });

  it('should throw an error when endpoint returns an error', async () => {
    // Setup endpoint to return an error
    (endpoint.execute as any).mockResolvedValueOnce({
      data: null,
      error: { message: 'Test error', status: 400 },
    });

    const options = enhancedEndpoint.mutationOptions();

    await expect(options.mutationFn({ name: 'test' })).rejects.toThrow('Test error');
  });
});

describe('createTanStackMutationAPI', () => {
  it('should transform a router object into a TanStackMutationRouter', () => {
    const mockEndpoint = new Endpoint(mockApiClient as any);
    const router = {
      users: {
        create: mockEndpoint,
        update: mockEndpoint,
      },
      posts: {
        create: mockEndpoint,
        comments: {
          create: mockEndpoint,
        },
      },
    };

    const api = createTanStackMutationAPI(router);

    // Check structure
    expect(api.users.create.mutationOptions).toBeDefined();
    expect(api.users.update.mutationOptions).toBeDefined();
    expect(api.posts.create.mutationOptions).toBeDefined();
    expect(api.posts.comments.create.mutationOptions).toBeDefined();
  });

  it('should handle empty objects', () => {
    const api = createTanStackMutationAPI({});
    expect(api).toEqual({});
  });

  it('should skip non-endpoint and non-object properties', () => {
    const mockEndpoint = new Endpoint(mockApiClient as any);
    const router = {
      users: {
        create: mockEndpoint,
        // @ts-ignore - Adding invalid property for test
        count: 100,
      },
    };

    const api = createTanStackMutationAPI(router as any);

    expect(api.users.create.mutationOptions).toBeDefined();
    // @ts-ignore - Checking that non-endpoint is preserved
    expect(api.users.count).toBe(100);
  });
});
