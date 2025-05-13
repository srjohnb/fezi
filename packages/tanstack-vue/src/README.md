# @fezi/tanstack-vue Source Code

This directory contains the source code for the TanStack Query (Vue) integration for fezi.

## File Structure

* `index.ts`: Main entry point that re-exports components and utilities from other files.
* `types.ts`: TypeScript type definitions for the library.
* `adapter.ts`: Core implementation for adapting Fezi endpoints to TanStack Query.
* `query.ts`: Query-specific endpoint enhancement implementation.
* `mutation.ts`: Mutation-specific endpoint enhancement implementation.
* `utils.ts`: Utility functions used throughout the library.

## Core Concepts

The library enhances Fezi endpoints with TanStack Query capabilities. This is done through three main functions:

1. `createTanStackAPI`: Creates a complete API with both query and mutation capabilities. This is the main function users will interact with.
2. `createTanStackQueryAPI`: Creates an API with only query capabilities (useful for read-only operations).
3. `createTanStackMutationAPI`: Creates an API with only mutation capabilities (useful for write-only operations).

Each enhanced endpoint provides methods to generate options for TanStack Query hooks (`useQuery`, `useMutation`), allowing seamless integration between Fezi and Vue components.

## Usage

```typescript
// Import the main function
import { createTanStackAPI } from '@fezi/tanstack-vue';
import { APIClient } from '@fezi/client';

// Create a client
const client = new APIClient({ /* ... */ });

// Define routes
const routes = {
  users: {
    get: client.route({ path: '/users' }),
    // ...
  }
};

// Create a TanStack Query API
const api = createTanStackAPI(routes);

// Use in a Vue component with useQuery
const { data, isLoading } = useQuery(api.users.get.queryOptions());
```

See the root README.md for more detailed examples. 