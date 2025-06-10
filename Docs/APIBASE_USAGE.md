# APIConnector Usage Guide

The versatile APIConnector class provides a drag-and-drop solution for REST API interactions through configuration rather than inheritance. This guide demonstrates various usage patterns and their corresponding HTTP requests.

## Basic Setup

### Simple Configuration

```javascript
const api = new APIConnector({
    baseUrl: 'https://api.myapp.com',
    apiVersion: 'v1',
    useAuth: true,
    authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});
```

### Default Operations
The APIConnector comes with pre-configured endpoints for common CRUD operations:

```javascript
// Fetch data
await api.fetchData({ page: 1, limit: 10 });
```
**HTTP Request:**
```
GET https://api.myapp.com/v1/data?page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
```

```javascript
// Create new data
await api.createData({ name: 'John Doe', email: 'john@example.com' });
```
**HTTP Request:**
```
POST https://api.myapp.com/v1/data
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

## Custom Endpoints Configuration

### E-commerce API Example

```javascript
const ecommerceAPI = new APIConnector({
    baseUrl: 'https://shop.example.com/api',
    apiVersion: 'v2',
    endpoints: {
        fetch: {method: 'GET', endpoint: '/products'},
        create: {method: 'POST', endpoint: '/products'},
        update: {method: 'PUT', endpoint: '/products/{productId}'},
        delete: {method: 'DELETE', endpoint: '/products/{productId}'},
        search: {method: 'GET', endpoint: '/products/search'},
        addToCart: {method: 'POST', endpoint: '/cart/{userId}/items'},
        checkout: {method: 'POST', endpoint: '/orders'},
        getOrders: {method: 'GET', endpoint: '/users/{userId}/orders'}
    }
});
```

### Usage Examples

```javascript
// Get all products with pagination
await ecommerceAPI.fetchData({ category: 'electronics', page: 2 });
```
**HTTP Request:**
```
GET https://shop.example.com/api/v2/products?category=electronics&page=2
```

```javascript
// Update a specific product
await ecommerceAPI.updateData(
    { name: 'Updated Product Name', price: 99.99 },
    { pathParams: { productId: 123 } }
);
```
**HTTP Request:**
```
PUT https://shop.example.com/api/v2/products/123
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 99.99
}
```

```javascript
// Custom operation: Add to cart
await ecommerceAPI.executeOperation('addToCart', 
    { productId: 456, quantity: 2 },
    { pathParams: { userId: 789 } }
);
```
**HTTP Request:**
```
POST https://shop.example.com/api/v2/cart/789/items
Content-Type: application/json

{
  "productId": 456,
  "quantity": 2
}
```

## Data Transformation

### Legacy API Integration

```javascript
const legacyAPI = new APIConnector({
    baseUrl: 'https://legacy-system.company.com',
    apiVersion: null, // No versioning
    dataTransform: {
        request: (data) => {
            // Transform modern format to legacy format
            return {
                user_name: data.userName,
                user_email: data.userEmail,
                created_at: new Date().toISOString(),
                meta_data: JSON.stringify(data.metadata || {})
            };
        },
        response: (data) => {
            // Transform legacy format to modern format
            return {
                id: data.user_id,
                userName: data.user_name,
                userEmail: data.user_email,
                createdAt: data.created_at,
                metadata: JSON.parse(data.meta_data || '{}')
            };
        },
        beforeSend: (data) => {
            console.log('Sending to legacy system:', data);
            return data;
        }
    }
});
```

```javascript
// Send modern format data
await legacyAPI.createData({
    userName: 'johndoe',
    userEmail: 'john@example.com',
    metadata: { department: 'IT', role: 'developer' }
});
```
**Actual HTTP Request (after transformation):**
```
POST https://legacy-system.company.com/data
Content-Type: application/json

{
  "user_name": "johndoe",
  "user_email": "john@example.com",
  "created_at": "2025-06-08T10:30:00.000Z",
  "meta_data": "{\"department\":\"IT\",\"role\":\"developer\"}"
}
```

**Response received from server:**
```json
{
  "user_id": 12345,
  "user_name": "johndoe",
  "user_email": "john@example.com",
  "created_at": "2025-06-08T10:30:00.000Z",
  "meta_data": "{\"department\":\"IT\",\"role\":\"developer\"}"
}
```

**Transformed response returned to application:**
```json
{
  "id": 12345,
  "userName": "johndoe",
  "userEmail": "john@example.com",
  "createdAt": "2025-06-08T10:30:00.000Z",
  "metadata": {
    "department": "IT",
    "role": "developer"
  }
}
```

## Caching Configuration

### Read-Heavy API with Caching

```javascript
const cachedAPI = new APIConnector({
    baseUrl: 'https://api.analytics.com',
    caching: {
        enabled: true,
        ttl: 600000, // 10 minutes
        strategy: 'memory',
        keyGenerator: (operation, data, options) => {
            return `${operation}-${JSON.stringify(options.params)}-${options.pathParams?.userId || 'global'}`;
        }
    }
});
```

```javascript
// First call - hits the API
const report1 = await cachedAPI.fetchData({ 
    startDate: '2025-06-01', 
    endDate: '2025-06-07' 
});
```
**HTTP Request (first call):**
```
GET https://api.analytics.com/v1/data?startDate=2025-06-01&endDate=2025-06-07
```

```javascript
// Second call within 10 minutes - served from cache
const report2 = await cachedAPI.fetchData({ 
    startDate: '2025-06-01', 
    endDate: '2025-06-07' 
});
```
**HTTP Request (second call):** `No HTTP request - served from cache`

Cache key generated: `"fetch-{\"startDate\":\"2025-06-01\",\"endDate\":\"2025-06-07\"}-global"`

## Retry Configuration

### Unreliable Service with Retry Logic

```javascript
const retryAPI = new APIConnector({
    baseUrl: 'https://api.unreliable-service.com',
    retry: {
        enabled: true,
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential',
        retryCondition: (error, attempt) => {
            // Retry on server errors and rate limiting
            return error.status >= 500 || error.status === 429;
        }
    }
});
```

```javascript
await retryAPI.fetchData({ userId: 123 });
```

**Retry Scenario:**
1. **First attempt:** `GET https://api.unreliable-service.com/v1/data?userId=123` → Returns 503 Service Unavailable
2. **Wait 1000ms**
3. **Second attempt:** `GET https://api.unreliable-service.com/v1/data?userId=123` → Returns 503 Service Unavailable
4. **Wait 2000ms (exponential backoff)**
5. **Third attempt:** `GET https://api.unreliable-service.com/v1/data?userId=123` → Returns 200 OK

## Validation Configuration

### Strict Data Validation

```javascript
const validatedAPI = new APIConnector({
    baseUrl: 'https://api.strict-service.com',
    validation: {
        enabled: true,
        schemas: {
            create: (data) => {
                const required = ['name', 'email', 'type'];
                return required.every(field => data[field] && data[field].length > 0);
            },
            update: (data) => {
                return data && data.id && typeof data.id === 'number';
            }
        }
    }
});
```

```javascript
// Valid data - will send request
try {
    await validatedAPI.createData({
        name: 'John Doe',
        email: 'john@example.com',
        type: 'customer'
    });
} catch (error) {
    // No error - validation passes
}
```
**HTTP Request:**
```
POST https://api.strict-service.com/v1/data
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "type": "customer"
}
```

```javascript
// Invalid data - will throw validation error
try {
    await validatedAPI.createData({
        name: 'John Doe'
        // Missing email and type
    });
} catch (error) {
    console.log(error.message); // "Validation failed for create"
    console.log(error.code);    // "VALIDATION_ERROR"
}
```
**HTTP Request:** `No HTTP request sent - validation fails before request`

## Request/Response Interceptors

### API with Request Tracking

```javascript
const trackedAPI = new APIConnector({
    baseUrl: 'https://api.tracked-service.com'
});

// Add request interceptor for analytics
trackedAPI.addRequestInterceptor(async (method, endpoint, options) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    options.headers = {
        ...options.headers,
        'X-Request-ID': requestId,
        'X-Client-Version': '2.1.0',
        'X-User-Agent': navigator.userAgent
    };

    console.log(`📤 ${method} ${endpoint} [${requestId}]`);
    return options;
});

// Add response interceptor for logging
trackedAPI.addResponseInterceptor(async (response, method, endpoint) => {
    console.log(`📥 ${method} ${endpoint} - Status: Success`);

    // Track API usage
    analytics.track('api_call', {
        method,
        endpoint,
        timestamp: Date.now()
    });

    return response;
});
```

```javascript
await trackedAPI.fetchData({ limit: 5 });
```
**HTTP Request (with interceptor modifications):**
```
GET https://api.tracked-service.com/v1/data?limit=5
X-Request-ID: req_1717837800000_k2j9x8m3p
X-Client-Version: 2.1.0
X-User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...
Content-Type: application/json
Accept: application/json
```

**Console Output:**
```
📤 GET /data [req_1717837800000_k2j9x8m3p]
📥 GET /data - Status: Success
```

## Complete Real-World Example

### Project Management API

```javascript
const projectAPI = new APIConnector({
    baseUrl: 'https://api.projectmanager.com',
    apiVersion: 'v3',
    useAuth: true,
    timeout: 15000,

    headers: {
        'X-Client-App': 'ProjectDashboard',
        'X-Client-Version': '1.5.2'
    },

    endpoints: {
        // Projects
        fetch: {method: 'GET', endpoint: '/projects'},
        create: {method: 'POST', endpoint: '/projects'},
        update: {method: 'PUT', endpoint: '/projects/{projectId}'},
        delete: {method: 'DELETE', endpoint: '/projects/{projectId}'},

        // Tasks
        getTasks: {method: 'GET', endpoint: '/projects/{projectId}/tasks'},
        createTask: {method: 'POST', endpoint: '/projects/{projectId}/tasks'},
        updateTask: {method: 'PUT', endpoint: '/tasks/{taskId}'},
        completeTask: {method: 'PATCH', endpoint: '/tasks/{taskId}/complete'},

        // Team
        getTeamMembers: {method: 'GET', endpoint: '/projects/{projectId}/team'},
        addTeamMember: {method: 'POST', endpoint: '/projects/{projectId}/team'},

        // Reports
        getProjectReport: {method: 'GET', endpoint: '/projects/{projectId}/report'},
        exportReport: {method: 'GET', endpoint: '/projects/{projectId}/export'}
    },

    dataTransform: {
        request: (data) => ({
            ...data,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
        response: (data) => ({
            ...data,
            clientProcessed: true,
            receivedAt: new Date().toISOString()
        })
    },

    caching: {
        enabled: true,
        ttl: 120000, // 2 minutes for project data
    },

    retry: {
        enabled: true,
        maxAttempts: 2,
        delay: 3000,
        backoff: 'linear'
    },

    validation: {
        enabled: true,
        schemas: {
            create: (data) => data.name && data.description && data.startDate,
            createTask: (data) => data.title && data.assigneeId && data.dueDate
        }
    },

    errorHandling: {
        logErrors: true,
        customErrorMessages: {
            401: 'Please log in to continue',
            403: 'You don\'t have permission to perform this action',
            404: 'Project or resource not found',
            429: 'Too many requests. Please wait a moment.',
            500: 'Server error. Our team has been notified.'
        },
        onError: async (error) => {
            if (error.status === 401) {
                // Redirect to login
                window.location.href = '/login';
            } else if (error.status >= 500) {
                // Report to error tracking service
                errorTracker.report(error);
            }
        }
    }
});
```

### Usage Examples with HTTP Requests

#### 1. Create a New Project
```javascript
const newProject = await projectAPI.createData({
    name: 'Website Redesign',
    description: 'Complete overhaul of company website',
    startDate: '2025-06-15',
    endDate: '2025-08-15',
    budget: 50000
});
```

**HTTP Request:**
```
POST https://api.projectmanager.com/v3/projects
Authorization: Bearer [auth-token]
X-Client-App: ProjectDashboard
X-Client-Version: 1.5.2
Content-Type: application/json
Accept: application/json

{
  "name": "Website Redesign",
  "description": "Complete overhaul of company website",
  "startDate": "2025-06-15",
  "endDate": "2025-08-15",
  "budget": 50000,
  "timestamp": "2025-06-08T10:30:00.000Z",
  "timezone": "America/New_York"
}
```

#### 2. Get Project Tasks
```javascript
const tasks = await projectAPI.executeOperation('getTasks', null, {
    pathParams: { projectId: 123 },
    params: { status: 'active', assignee: 'john@company.com' }
});
```

**HTTP Request:**
```
GET https://api.projectmanager.com/v3/projects/123/tasks?status=active&assignee=john@company.com
Authorization: Bearer [auth-token]
X-Client-App: ProjectDashboard
X-Client-Version: 1.5.2
Accept: application/json
```

#### 3. Complete a Task
```javascript
await projectAPI.executeOperation('completeTask', 
    { completionNotes: 'All requirements met and tested' },
    { pathParams: { taskId: 456 } }
);
```

**HTTP Request:**
```
PATCH https://api.projectmanager.com/v3/tasks/456/complete
Authorization: Bearer [auth-token]
X-Client-App: ProjectDashboard
X-Client-Version: 1.5.2
Content-Type: application/json

{
  "completionNotes": "All requirements met and tested",
  "timestamp": "2025-06-08T10:30:00.000Z",
  "timezone": "America/New_York"
}
```

#### 4. Export Project Report
```javascript
const reportData = await projectAPI.executeOperation('exportReport', null, {
    pathParams: { projectId: 123 },
    params: { format: 'pdf', includeCharts: true }
});
```

**HTTP Request:**
```
GET https://api.projectmanager.com/v3/projects/123/export?format=pdf&includeCharts=true
Authorization: Bearer [auth-token]
X-Client-App: ProjectDashboard
X-Client-Version: 1.5.2
Accept: application/json
```

### 5. Fully set executeOperation function
```javascript
// Fully initialized executeOperation function call with all possible variables

const operation = "fetch"|"create"|"update"|"patch"|"delete"|"search"|"bulk"; //any default operation or custom operation name

const data = {
    // For create/update/patch operations (any custom data structure)
    id: 12345,
    name: "Sample Item",
    email: "user@example.com",
    tags: ["tag1", "tag2", "tag3"],
    metadata: {
        source: "web",
    },
    settings: {
        notifications: true,
    }
};

const options = {
    // Path parameters for URL substitution (e.g., /data/{id})
    pathParams: {
        id: 12345,
        userId: 67890,
    },

    // Query parameters (?param=value)
    params: {
        page: 1,
        limit: 50,
    },

    // Custom headers for this specific request
    headers: {
        "X-Custom-Header": "custom-value",
        "X-Request-ID": "req-12345-abcdef",
        "X-Client-Version": "1.2.3",
    },

    // Request timeout override (milliseconds)
    timeout: 30000,

    // Skip authentication for this request
    skipAuth: false,

    // Custom request ID for tracking/cancellation  
    requestId: "custom-request-id-12345",

    // Custom validation schema for this operation
    validation: {
        enabled: true,
        schemas: {
            create: (data) => data.name && data.description && data.startDate,
            createTask: (data) => data.title && data.assigneeId && data.dueDate
        }
    },

    // Cache behavior for this request
    caching: {
        enabled: true,
        ttl: 600000, // 10 minutes
        keyGenerator: (operation, data, options) => {
            return `${operation}-${JSON.stringify(options.params)}-${options.pathParams?.userId || 'global'}`;
        }
    },

    // Custom data transformations for this request
    dataTransform: {
        request: (data) => ({
            ...data,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
        response: (data) => ({
            ...data,
            clientProcessed: true,
            receivedAt: new Date().toISOString()
        }),
        beforeSend: (data) => {
            console.log('Sending to legacy system:', data);
            return data;
        },
        afterReceive: (data) => {
            console.log('Received from legacy system:', data);
            return data;
        },
        error: (error) => {
            console.error('Error during data transformation:', error);
            throw error; // Re-throw to propagate error
        }
    },

    // Retry configuration override
    retry: {
        enabled: true,
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential',
        retryCondition: (error, attempt) => {
            // Retry on server errors and rate limiting
            return error.status >= 500 || error.status === 429; //true means retry
        }
    },

    // Progress tracking (for large uploads/downloads)
    onProgress: (progress) => {
        console.log(`Progress: ${progress.loaded}/${progress.total} (${Math.round(progress.percent)}%)`);
    },

    // Success callback
    onSuccess: (result) => {
        console.log("Operation successful:", result);
    },

    // Error callback
    onError: (error) => {
        console.error("Operation failed:", error);
    }
};

// Execute the operation with all initialized parameters
const result = await apiConnector.executeOperation(operation, data, options);
```



## Error Handling Examples

### Validation Error
```javascript
try {
    await projectAPI.createData({
        name: 'Incomplete Project'
        // Missing required fields: description, startDate
    });
} catch (error) {
    console.log(error.code); // "VALIDATION_ERROR"
    console.log(error.status); // 400
}
```
**Result:** No HTTP request sent, validation fails locally

### API Error with Retry
```javascript
try {
    await projectAPI.fetchData({ projectId: 999 });
} catch (error) {
    console.log(error.code); // "API_ERROR"
    console.log(error.status); // 404
    console.log(error.message); // "Project or resource not found"
}
```

**HTTP Requests:**
1. `GET https://api.projectmanager.com/v3/projects?projectId=999` → 404 Not Found
2. No retry (404 is not in retryable errors list)

### Network Error with Retry
```javascript
// If server returns 503 Service Unavailable
try {
    await projectAPI.fetchData();
} catch (error) {
    console.log(error.code); // "API_ERROR" 
    console.log(error.status); // 503
}
```

**HTTP Requests:**
1. `GET https://api.projectmanager.com/v3/projects` → 503 Service Unavailable
2. **Wait 3000ms**
3. `GET https://api.projectmanager.com/v3/projects` → 503 Service Unavailable
4. **Final attempt fails, error thrown**

## Key Benefits

1. **No Inheritance Required**: Configure behavior through settings instead of overriding methods
2. **Drag-and-Drop Ready**: Works immediately with basic configuration
3. **Highly Configurable**: Customize endpoints, transformations, caching, retries, and validation
4. **Request/Response Interception**: Add cross-cutting concerns like logging and analytics
5. **Built-in Error Handling**: Comprehensive error handling with custom messages and callbacks
6. **Automatic Retries**: Configurable retry logic with backoff strategies
7. **Response Caching**: Built-in caching with TTL and custom key generation
8. **Data Transformation**: Transform data between your application and API formats
9. **Request Cancellation**: Cancel individual or all pending requests
10. **TypeScript Ready**: Full type safety when used with TypeScript