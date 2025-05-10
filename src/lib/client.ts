import { ZimFetchOptions, ZimFetchResponse, ZimFetchError } from './types';
import { Endpoint, RequestConfig } from './endpoint';
import { createClientAPI } from './router';

/**
 * APIClient configuration options
 */
export interface APIClientOptions {
  /**
   * Base URL for all API requests
   */
  url: string;

  /**
   * Default headers for all requests
   * Can be a static object or a function that returns headers
   */
  headers?: Record<string, string> | (() => Record<string, string>);

  /**
   * Default timeout in milliseconds
   * @default 10000
   */
  timeout?: number;

  /**
   * Default path prefix for all requests
   */
  basePath?: string;
}

// Re-export for convenience
export { Endpoint, RequestConfig, createClientAPI };
export type { RouterDefinition, ClientAPI } from './router';

/**
 * APIClient for making HTTP requests with schema validation
 *
 * Example usage:
 * ```typescript
 * const client = new APIClient({
 *   url: 'http://localhost:3000'
 * });
 *
 * // Define schemas (using Zod as an example)
 * const userInputSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email()
 * });
 *
 * const userOutputSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string().email(),
 *   createdAt: z.string().datetime()
 * });
 *
 * // Create endpoints
 * const createUser = client
 *   .route({ method: 'POST', path: '/users' })
 *   .input(userInputSchema)
 *   .output(userOutputSchema);
 *
 * // Create a router
 * const router = {
 *   users: {
 *     create: createUser
 *   }
 * };
 *
 * // Create a type-safe API client
 * const api = createClientAPI(router);
 *
 * // Use the API
 * const newUser = await api.users.create({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * ```
 */
export class APIClient {
  private options: APIClientOptions;

  /**
   * Create a new APIClient instance
   */
  constructor(options: APIClientOptions) {
    this.options = {
      timeout: 10000,
      ...options,
    };
  }

  /**
   * Create a new route with the given configuration
   * @param config Route configuration including method and path
   */
  route<TInput = any, TOutput = any>(config: RequestConfig): Endpoint<TInput, TOutput> {
    const endpoint = new Endpoint<TInput, TOutput>(this);

    if (config.path) {
      endpoint.path(config.path);
    }

    if (config.method) {
      endpoint.method(config.method);
    }

    if (config.headers) {
      endpoint.headers(config.headers);
    }

    if (config.timeout) {
      endpoint.timeout(config.timeout);
    }

    return endpoint;
  }

  /**
   * Execute a request using the provided config
   * @internal This is used by Endpoint and shouldn't be called directly
   */
  async execute(
    config: RequestConfig & {
      body?: any;
      params?: Record<string, string | number | boolean | null | undefined>;
    }
  ): Promise<ZimFetchResponse<any>> {
    const url = this.buildUrl(config);
    const options = this.buildOptions(config);

    try {
      return await this.fetchRequest(url, options);
    } catch (error) {
      if (error instanceof ZimFetchError) {
        throw error;
      }
      throw new ZimFetchError(error instanceof Error ? error.message : String(error), url, options);
    }
  }

  /**
   * Build the full URL for a request
   */
  private buildUrl(
    config: RequestConfig & {
      params?: Record<string, string | number | boolean | null | undefined>;
    }
  ): string {
    // Normalize base URL
    const baseUrl = this.options.url.endsWith('/')
      ? this.options.url.slice(0, -1)
      : this.options.url;

    // Add base path if defined
    let url = baseUrl;
    if (this.options.basePath) {
      const basePath = this.options.basePath.startsWith('/')
        ? this.options.basePath
        : `/${this.options.basePath}`;
      url += basePath;
    }

    // Add request path if defined
    if (config.path) {
      const path = config.path.startsWith('/') ? config.path : `/${config.path}`;
      url += path;
    }

    // Add query parameters if present
    if (config.params && Object.keys(config.params).length > 0) {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(config.params)) {
        if (value != null) {
          searchParams.append(key, String(value));
        }
      }

      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Build request options by merging defaults with request-specific options
   */
  private buildOptions(config: RequestConfig & { body?: any }): ZimFetchOptions {
    const options: ZimFetchOptions = {
      method: config.method || 'GET',
      timeout: config.timeout ?? this.options.timeout,
      headers: this.mergeHeaders(config.headers),
    };

    // Add body if present and not a GET or HEAD request
    if (config.body && !['GET', 'HEAD'].includes(options.method || '')) {
      options.body = JSON.stringify(config.body);
    }

    return options;
  }

  /**
   * Merge default headers with request-specific headers
   */
  private mergeHeaders(requestHeaders?: Record<string, string>): Record<string, string> {
    const defaultHeaders =
      typeof this.options.headers === 'function'
        ? this.options.headers()
        : this.options.headers || {};

    return {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...requestHeaders,
    };
  }

  /**
   * Perform a fetch request
   */
  private async fetchRequest(
    url: string,
    options: ZimFetchOptions
  ): Promise<ZimFetchResponse<any>> {
    // Create AbortController for timeout if needed
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    if (options.timeout) {
      timeoutId = setTimeout(() => controller.abort(), options.timeout);
    }

    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);
      const parseJson = options.parseJson !== false;

      let data: any;
      if (parseJson && response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        data,
        error: null,
        status: response.status,
        headers: response.headers,
        ok: response.ok,
        response,
      };
    } catch (error) {
      throw new ZimFetchError(error instanceof Error ? error.message : String(error), url, options);
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }
}
