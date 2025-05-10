# ZimFetch

A lightweight fetch wrapper for browser and Node.js environments.

## Installation

```bash
# npm
npm install @johngerome/zimfetch

# yarn
yarn add @johngerome/zimfetch

# pnpm
pnpm add @johngerome/zimfetch
```

## Features

- **TypeScript-first**: Full type definitions for safety and autocompletion.
- **Universal**: Works in both browser and Node.js environments.
- **Simple API**: Minimal, intuitive API for common HTTP operations.
- **Automatic JSON parsing**: Automatically parses JSON responses when possible.
- **Schema validation**: Optional input/output validation with Zod, Yup, Joi, or custom schemas.
- **Error handling**: Consistent error objects with HTTP status, response data, and request details.
- **Request timeouts**: Abort requests after a configurable timeout.
- **Request cancellation**: Supports AbortController for manual cancellation.
- **Custom headers and base URL**: Easily set default headers and a base URL for all requests.
- **Composable endpoints and routers**: Build type-safe API clients with endpoint and router definitions.
- **Extensible**: Easily integrate with validation libraries and custom logic.
- **Promise-based**: Modern async/await support.
- **Lightweight**: Minimal dependencies and small bundle size.

## Usage

### 1. Basic APIClient Usage

```typescript
import { APIClient } from '@johngerome/zimfetch';

const client = new APIClient({ url: 'https://jsonplaceholder.typicode.com' });

// Basic GET request
const response = await client.execute({ path: '/posts/1' });
console.log(response.data);

// POST request with JSON body
const postResponse = await client.execute({
  path: '/posts',
  method: 'POST',
  body: { title: 'foo', body: 'bar', userId: 1 },
});
console.log(postResponse.data);
```

### 2. Advanced Options (Headers, Timeout)

```typescript
const advancedResponse = await client.execute({
  path: '/posts/1',
  headers: {
    'Authorization': 'Bearer token123',
    'X-Custom-Header': 'custom-value',
  },
  timeout: 3000, // 3 seconds
});
```

### 3. Schema Validation with Zod

```typescript
import { z } from 'zod';

const userSchema = z.object({ id: z.number(), name: z.string() });

const getUser = client.route({ method: 'GET', path: '/users/1' }).output(userSchema);
const user = await getUser.execute();
// user is fully type-safe
```

### 4. Type-Safe Router Pattern

```typescript
import { createClientAPI } from '@johngerome/zimfetch';

const router = {
  users: {
    get: client.route({ method: 'GET', path: '/users/1' }).output(userSchema),
  },
  posts: {
    create: client
      .route({ method: 'POST', path: '/posts' })
      .input(z.object({ title: z.string(), body: z.string(), userId: z.number() }))
      .output(z.object({ id: z.number(), title: z.string(), body: z.string(), userId: z.number() })),
  },
};

const api = createClientAPI(router);

const user = await api.users.get();
const newPost = await api.posts.create({ title: 'foo', body: 'bar', userId: 1 });
```

// For more advanced examples, see the `examples/` directory in the repo.


## API Reference

### `@johngerome/zimfetch(url, options?)`

#### Parameters

- `url` - The URL to make the request to
- `options` - Optional configuration object

#### Options

- `method` - HTTP method (GET, POST, PUT, DELETE, etc.)
- `headers` - Request headers
- `body` - Request body (automatically stringified if object)
- `timeout` - Request timeout in milliseconds
- `retries` - Number of retry attempts for failed requests
- `signal` - AbortSignal to cancel the request

#### Returns

Promise that resolves to a response object with:

- `data` - Parsed response data
- `status` - HTTP status code
- `headers` - Response headers
- `ok` - Boolean indicating if status is in the range 200-299

## License

MIT
