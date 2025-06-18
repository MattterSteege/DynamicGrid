/**
 * Versatile API client class for handling REST API operations.
 * This class provides a complete drag-and-drop solution that can be configured
 * through settings rather than requiring method overrides.
 * @author Matt ter Steege (Kronk)
 */
class APIConnector {
    /**
     * Creates a new APIConnector instance.
     * @param {Object} config - Configuration options for the API.
     * @param {string} [config.baseUrl='https://api.example.com'] - The base URL for the API.
     * @param {Object} [config.headers={}] - Default headers to include with each request.
     * @param {number} [config.timeout=30000] - Request timeout in milliseconds.
     * @param {boolean} [config.useAuth=false] - Whether to use authentication.
     * @param {string} [config.authToken=null] - Authentication token.
     * @param {string} [config.apiVersion='v1'] - API version.
     * @param {Object} [config.endpoints={}] - Endpoint configurations.
     * @param {Object} [config.dataTransform={}] - Data transformation functions.
     * @param {Object} [config.errorHandling={}] - Custom error handling configuration.
     * @param {Object} [config.caching={}] - Caching configuration.
     * @param {Object} [config.validation={}] - Data validation configuration.
     */
    constructor(config = {}) {
        // Basic configuration
        this.baseUrl = config.baseUrl || '';
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...config.headers
        };
        this.timeout = config.timeout || 30000;
        this.useAuth = config.useAuth || false;
        this.authToken = config.authToken || null;
        this.apiVersion = config.apiVersion;
        this.abortControllers = new Map();

        // Advanced configuration
        this.endpoints = this.initializeEndpoints(config.endpoints || {});
        this.dataTransform = this.initializeDataTransform(config.dataTransform || {});
        this.errorHandling = this.initializeErrorHandling(config.errorHandling || {});
        this.caching = this.initializeCaching(config.caching || {});
        this.validation = this.initializeValidation(config.validation || {});

        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];

        // Auto-retry configuration
        this.retryConfig = {
            enabled: config.retry?.enabled || false,
            maxAttempts: config.retry?.maxAttempts || 3,
            delay: config.retry?.delay || 1000,
            backoff: config.retry?.backoff || 'exponential', // 'linear', 'exponential'
            retryCondition: config.retry?.retryCondition || this.defaultRetryCondition.bind(this)
        };
    }

    /**
     * Initialize endpoint configurations with defaults.
     * @param {Object} endpoints - Endpoint configurations.
     * @returns {Object} Initialized endpoint configurations.
     */
    initializeEndpoints(endpoints) {
        const defaults = {
            fetch: { method: 'GET', endpoint: '/data' },
            create: { method: 'POST', endpoint: '/data' },
            update: { method: 'PUT', endpoint: '/data/{id}' },
            patch: { method: 'PATCH', endpoint: '/data/{id}' },
            delete: { method: 'DELETE', endpoint: '/data/{id}' },
            search: { method: 'GET', endpoint: '/search' },
            bulk: { method: 'POST', endpoint: '/data/bulk' }
        };

        return { ...defaults, ...endpoints };
    }

    /**
     * Initialize data transformation functions.
     * @param {Object} transform - Transformation configurations.
     * @returns {Object} Initialized transformation functions.
     */
    initializeDataTransform(transform) {
        return {
            request: transform.request || ((data) => data),
            response: transform.response || ((data) => data),
            error: transform.error || ((error) => error),
            beforeSend: transform.beforeSend || ((data) => data),
            afterReceive: transform.afterReceive || ((data) => data)
        };
    }

    /**
     * Initialize error handling configuration.
     * @param {Object} errorHandling - Error handling configurations.
     * @returns {Object} Initialized error handling configuration.
     */
    initializeErrorHandling(errorHandling) {
        return {
            showUserFriendlyMessages: errorHandling.showUserFriendlyMessages !== false,
            logErrors: errorHandling.logErrors !== false,
            customErrorMessages: errorHandling.customErrorMessages || {},
            onError: errorHandling.onError || null,
            retryableErrors: errorHandling.retryableErrors || [408, 429, 500, 502, 503, 504]
        };
    }

    /**
     * Initialize caching configuration.
     * @param {Object} caching - Caching configurations.
     * @returns {Object} Initialized caching configuration.
     */
    initializeCaching(caching) {
        return {
            enabled: caching.enabled || false,
            ttl: caching.ttl || 300000, // 5 minutes default
            strategy: caching.strategy || 'memory', // 'memory', 'sessionStorage', 'localStorage'
            keyGenerator: caching.keyGenerator || this.generateCacheKey.bind(this),
            cache: new Map()
        };
    }

    /**
     * Initialize validation configuration.
     * @param {Object} validation - Validation configurations.
     * @returns {Object} Initialized validation configuration.
     */
    initializeValidation(validation) {
        return {
            enabled: validation.enabled || false,
            schemas: validation.schemas || {},
            validator: validation.validator || this.defaultValidator.bind(this)
        };
    }

    /**
     * Add a request interceptor.
     * @param {Function} interceptor - Function to modify requests before sending.
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add a response interceptor.
     * @param {Function} interceptor - Function to modify responses after receiving.
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Execute a configured API operation.
     * @param {string} operation - The operation name (fetch, create, update, etc.).
     * @param {*} data - Data for the operation.
     * @param {Object} options - Additional options.
     * @returns {Promise<*>} The operation result.
     */
    executeOperation(operation, data = null, options = {}) {
        const config = this.endpoints[operation];
        if (!config) {
            return Promise.reject(new APIError(`Unknown operation: ${operation}`, 'UNKNOWN_OPERATION', 400));
        }

        // Validate data if validation is enabled
        const validationPromise = (this.validation.enabled && data)
            ? this.validateData(operation, data)
            : Promise.resolve();

        return validationPromise.then(() => {
            // Transform data before sending
            const transformedData = this.dataTransform.beforeSend(
                this.dataTransform.request(data)
            );

            // Check cache for GET requests
            if (config.method === 'GET' && this.caching.enabled) {
                const cacheKey = this.caching.keyGenerator(operation, transformedData, options);
                const cachedResult = this.getFromCache(cacheKey);
                if (cachedResult) {
                    return Promise.resolve(this.dataTransform.afterReceive(
                        this.dataTransform.response(cachedResult)
                    ));
                }
            }

            // Prepare endpoint URL with parameter substitution
            let endpoint = config.endpoint;
            if (options.pathParams) {
                endpoint = this.substitutePathParams(endpoint, options.pathParams);
            }

            // Execute request with retry logic
            const requestOptions = {
                data: transformedData,
                params: options.params || {},
                headers: options.headers || {},
                ...options
            };

            const requestPromise = this.retryConfig.enabled
                ? this.executeWithRetry(config.method, endpoint, requestOptions)
                : this.request(config.method, endpoint, requestOptions);

            return requestPromise.then(result => {
                // Transform response
                const transformedResult = this.dataTransform.afterReceive(
                    this.dataTransform.response(result)
                );

                // Cache the result for GET requests
                if (config.method === 'GET' && this.caching.enabled) {
                    const cacheKey = this.caching.keyGenerator(operation, transformedData, options);
                    this.setCache(cacheKey, transformedResult);
                }

                return transformedResult;
            });
        });
    }

    /**
     * Convenience methods for common operations.
     */
    fetchData(params = {}, options = {}) {
        return this.executeOperation('fetch', null, { params, ...options });
    }

    createData(data, options = {}) {
        return this.executeOperation('create', data, options);
    }

    patchData(data, options = {}) {
        return this.executeOperation('patch', data, options);
    }

    deleteData(options = {}) {
        return this.executeOperation('delete', null, options);
    }

    searchData(query, options = {}) {
        return this.executeOperation('search', query, options);
    }

    bulkOperation(data, options = {}) {
        return this.executeOperation('bulk', data, options);
    }

    /**
     * Execute request with retry logic.
     * @param {string} method - HTTP method.
     * @param {string} endpoint - API endpoint.
     * @param {Object} options - Request options.
     * @returns {Promise<*>} Request result.
     */
    executeWithRetry(method, endpoint, options) {
        const attemptRequest = (attempt) => {
            return this.request(method, endpoint, options)
                .catch(error => {
                    if (attempt >= this.retryConfig.maxAttempts ||
                        !this.retryConfig.retryCondition(error, attempt)) {
                        throw error;
                    }

                    // Calculate delay
                    let delay = this.retryConfig.delay;
                    if (this.retryConfig.backoff === 'exponential') {
                        delay *= Math.pow(2, attempt - 1);
                    }

                    return this.sleep(delay).then(() => attemptRequest(attempt + 1));
                });
        };

        return attemptRequest(1);
    }

    /**
     * Default retry condition.
     * @param {Error} error - The error that occurred.
     * @param {number} attempt - Current attempt number.
     * @returns {boolean} Whether to retry.
     */
    defaultRetryCondition(error, attempt) {
        return this.errorHandling.retryableErrors.includes(error.status);
    }

    /**
     * Sleep utility for retry delays.
     * @param {number} ms - Milliseconds to sleep.
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Substitute path parameters in endpoint URL.
     * @param {string} endpoint - Endpoint template.
     * @param {Object} params - Path parameters.
     * @returns {string} Endpoint with substituted parameters.
     */
    substitutePathParams(endpoint, params) {
        return endpoint.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Validate data using configured schemas.
     * @param {string} operation - Operation name.
     * @param {*} data - Data to validate.
     * @returns {Promise<void>}
     */
    validateData(operation, data) {
        const schema = this.validation.schemas[operation];
        if (schema) {
            return Promise.resolve(this.validation.validator(data, schema))
                .then(isValid => {
                    if (!isValid) {
                        throw new APIError(`Validation failed for ${operation}`, 'VALIDATION_ERROR', 400);
                    }
                });
        }
        return Promise.resolve();
    }

    /**
     * Default data validator.
     * @param {*} data - Data to validate.
     * @param {*} schema - Validation schema.
     * @returns {boolean} Whether data is valid.
     */
    defaultValidator(data, schema) {
        // Simple validation - can be replaced with more sophisticated validation
        if (typeof schema === 'function') {
            return schema(data);
        }
        return true;
    }

    /**
     * Generate cache key.
     * @param {string} operation - Operation name.
     * @param {*} data - Request data.
     * @param {Object} options - Request options.
     * @returns {string} Cache key.
     */
    generateCacheKey(operation, data, options) {
        const key = {
            operation,
            data: data || null,
            params: options.params || {},
            pathParams: options.pathParams || {}
        };
        return JSON.stringify(key);
    }

    /**
     * Get data from cache.
     * @param {string} key - Cache key.
     * @returns {*} Cached data or null.
     */
    getFromCache(key) {
        if (!this.caching.enabled) return null;

        const cached = this.caching.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.caching.ttl) {
            return cached.data;
        }

        if (cached) {
            this.caching.cache.delete(key);
        }
        return null;
    }

    /**
     * Set data in cache.
     * @param {string} key - Cache key.
     * @param {*} data - Data to cache.
     */
    setCache(key, data) {
        if (!this.caching.enabled) return;

        this.caching.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache.
     * @param {string} [pattern] - Optional pattern to match keys.
     */
    clearCache(pattern) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const key of this.caching.cache.keys()) {
                if (regex.test(key)) {
                    this.caching.cache.delete(key);
                }
            }
        } else {
            this.caching.cache.clear();
        }
    }

    /**
     * Sets the authentication token.
     * @param {string} token - The authentication token.
     */
    setAuthToken(token) {
        this.authToken = token;
        this.useAuth = !!token;
    }

    /**
     * Clears the authentication token.
     */
    clearAuthToken() {
        this.authToken = null;
        this.useAuth = false;
    }

    /**
     * Constructs the complete URL for an endpoint.
     * @param {string} endpoint - The API endpoint.
     * @returns {string} The complete URL.
     */
    buildUrl(endpoint) {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

        if (this.apiVersion) {
            return `${this.baseUrl}/${this.apiVersion}/${cleanEndpoint}`;
        }
        return `${this.baseUrl}/${cleanEndpoint}`;
    }

    /**
     * Prepares headers for a request, including auth if enabled.
     * @returns {Object} The prepared headers.
     */
    prepareHeaders() {
        const headers = { ...this.headers };

        if (this.useAuth && this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    /**
     * Makes a request to the API with interceptors.
     * @param {string} method - The HTTP method.
     * @param {string} endpoint - The API endpoint.
     * @param {Object} options - Request options.
     * @returns {Promise<Object>} The response data.
     */
    request(method, endpoint, options = {}) {
        // Apply request interceptors
        const applyRequestInterceptors = (modifiedOptions) => {
            return this.requestInterceptors.reduce((promise, interceptor) => {
                return promise.then(opts => Promise.resolve(interceptor(method, endpoint, opts)));
            }, Promise.resolve(modifiedOptions));
        };

        return applyRequestInterceptors({ ...options })
            .then(modifiedOptions => {
                return this.executeRequest(method, endpoint, modifiedOptions);
            })
            .then(result => {
                // Apply response interceptors
                return this.responseInterceptors.reduce((promise, interceptor) => {
                    return promise.then(res => Promise.resolve(interceptor(res, method, endpoint)));
                }, Promise.resolve(result));
            })
            .catch(error => {
                // Handle errors through configured error handling
                return this.handleError(error).then(() => {
                    throw error;
                });
            });
    }

    /**
     * Execute the actual HTTP request.
     * @param {string} method - HTTP method.
     * @param {string} endpoint - API endpoint.
     * @param {Object} options - Request options.
     * @returns {Promise<*>} Response data.
     */
    executeRequest(method, endpoint, options = {}) {
        const {
            data = null,
            params = {},
            headers = {},
            skipAuth = false,
            timeout = this.timeout,
            requestId = Date.now().toString()
        } = options;

        // Create URL with query parameters
        let url = this.buildUrl(endpoint);
        if (Object.keys(params).length > 0) {
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                queryParams.append(key, value);
            }
            url += `?${queryParams.toString()}`;
        }

        // Prepare request headers
        const requestHeaders = {
            ...this.prepareHeaders(),
            ...headers
        };

        if (skipAuth) {
            delete requestHeaders['Authorization'];
        }

        // Prepare request options
        const fetchOptions = {
            method,
            headers: requestHeaders,
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'same-origin',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
        };

        // Add body for methods that support it
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && data !== null) {
            fetchOptions.body = JSON.stringify(data);
        }

        // Set up abort controller for timeout
        const controller = new AbortController();
        fetchOptions.signal = controller.signal;
        this.abortControllers.set(requestId, controller);

        // Set timeout
        const timeoutId = setTimeout(() => {
            if (this.abortControllers.has(requestId)) {
                controller.abort();
                this.abortControllers.delete(requestId);
            }
        }, timeout);

        return fetch(url, fetchOptions)
            .then(response => {
                clearTimeout(timeoutId);
                this.abortControllers.delete(requestId);
                return this.handleResponse(response);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                this.abortControllers.delete(requestId);

                if (error.name === 'AbortError') {
                    throw new APIError('Request timeout', 'TIMEOUT', 408);
                }

                throw new APIError(
                    error.message || 'Network error',
                    'NETWORK_ERROR',
                    0,
                    error
                );
            });
    }

    /**
     * Handles API responses and error cases.
     * @param {Response} response - The fetch Response object.
     * @returns {Promise<Object>} The parsed response data.
     */
    handleResponse(response) {
        const parseResponse = () => {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                return response.text();
            }
        };

        return parseResponse()
            .catch(error => {
                throw new APIError(
                    'Failed to parse response',
                    'PARSE_ERROR',
                    response.status,
                    error
                );
            })
            .then(data => {
                if (!response.ok) {
                    const errorCode = data.error?.code || 'API_ERROR';
                    const errorMessage = data.error?.message || 'Unknown API error';

                    throw new APIError(
                        errorMessage,
                        errorCode,
                        response.status,
                        null,
                        data
                    );
                }

                return data;
            });
    }

    /**
     * Handle errors with configured error handling.
     * @param {Error} error - The error to handle.
     * @returns {Promise<void>}
     */
    handleError(error) {
        if (this.errorHandling.logErrors) {
            console.error('API Error:', error);
        }

        if (this.errorHandling.onError) {
            return Promise.resolve(this.errorHandling.onError(error));
        }

        return Promise.resolve();
    }

    /**
     * Cancel an ongoing request.
     * @param {string} requestId - Request ID to cancel.
     * @returns {boolean} Whether request was cancelled.
     */
    cancelRequest(requestId) {
        if (this.abortControllers.has(requestId)) {
            const controller = this.abortControllers.get(requestId);
            controller.abort();
            this.abortControllers.delete(requestId);
            return true;
        }
        return false;
    }

    /**
     * Cancel all ongoing requests.
     */
    cancelAllRequests() {
        for (const controller of this.abortControllers.values()) {
            controller.abort();
        }
        this.abortControllers.clear();
    }
}

/**
 * Custom error class for API-related errors.
 */
class APIError extends Error {
    constructor(message, code, status, originalError = null, responseData = null) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.status = status;
        this.originalError = originalError;
        this.responseData = responseData;
        this.timestamp = new Date();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }
}