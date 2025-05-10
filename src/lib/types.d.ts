import { ZimFetchError } from './types';

/**
 * Response structure returned by endpoint execution
 */
export type EndpointResponse<T> = {
  data: T | null;
  error: ZimFetchError | null;
  status: number;
};
