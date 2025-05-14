/**
 * Base API client class for handling REST API operations.
 * This class provides a foundation for API interactions with consistent error handling,
 * request formatting, authentication, and other common API functionality.
 */
class APIBase {
    /**
     * Creates a new APIBase instance.
     * @param {DynamicGrid} dynamicGrid - The DynamicGrid instance.
     * @param {Object} config - Configuration options for the API.
     * @param {string} [config.baseUrl='https://api.example.com'] - The base URL for the API.
     * @param {Object} [config.headers={}] - Default headers to include with each request.
     * @param {number} [config.timeout=30000] - Request timeout in milliseconds.
     * @param {boolean} [config.useAuth=false] - Whether to use authentication.
     * @param {string} [config.authToken=null] - Authentication token.
     * @param {string} [config.apiVersion='v1'] - API version.
     */
    constructor(dynamicGrid, config = {}) {
        this.dynamicGrid = dynamicGrid;

        this.baseUrl = config.baseUrl || 'https://api.example.com';
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

        this.dynamicGrid.keyboardShortcuts.addShortcut('ctrl+s', () => this.postData(this.dynamicGrid.engine.updateTracker.updates));
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
        // Remove leading slash if present
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

        if (this.apiVersion)
            return `${this.baseUrl}/${this.apiVersion}/${cleanEndpoint}`;
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
     * Makes a request to the API.
     * @param {string} method - The HTTP method (GET, POST, PUT, DELETE, etc.).
     * @param {string} endpoint - The API endpoint.
     * @param {Object} [options={}] - Request options.
     * @param {Object} [options.data=null] - Data to send with the request.
     * @param {Object} [options.params={}] - URL parameters.
     * @param {Object} [options.headers={}] - Additional headers.
     * @param {boolean} [options.skipAuth=false] - Whether to skip authentication.
     * @param {number} [options.timeout] - Custom timeout for this request.
     * @param {string} [options.requestId] - Unique identifier for the request (for cancellation).
     * @returns {Promise<Object>} The response data.
     * @throws {APIError} If the request fails.
     */
    async request(method, endpoint, options = {}) {
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

        try {
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            this.abortControllers.delete(requestId);

            // Handle response
            return await this.handleResponse(response);
        } catch (error) {
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
        }
    }

    /**
     * Handles API responses and error cases.
     * @param {Response} response - The fetch Response object.
     * @returns {Promise<Object>} The parsed response data.
     * @throws {APIError} If the response indicates an error.
     */
    async handleResponse(response) {
        let data;

        // Try to parse the response body
        try {
            // Check content type to determine parsing method
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        } catch (error) {
            throw new APIError(
                'Failed to parse response',
                'PARSE_ERROR',
                response.status,
                error
            );
        }

        // Handle error responses
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
    }

    /**
     * Cancels an ongoing request.
     * @param {string} requestId - The ID of the request to cancel.
     * @returns {boolean} Whether a request was cancelled.
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
     * Cancels all ongoing requests.
     */
    cancelAllRequests() {
        for (const controller of this.abortControllers.values()) {
            controller.abort();
        }
        this.abortControllers.clear();
    }

    /**
     * Fetches data from the API.
     * @abstract
     * @param {Object} [params={}] - URL parameters.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If the method is not overridden in a subclass.
     */
    async fetchData(params = {}, options = {}) {
        throw new Error('Method "fetchData" must be implemented in a subclass');
    }

    /**
     * Posts data to the API.
     * @abstract
     * @param {Object} data - The data to be posted.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If the method is not overridden in a subclass.
     */
    async postData(data, options = {}) {
        throw new Error('Method "postData" must be implemented in a subclass');
    }

    /**
     * Updates data in the API.
     * @abstract
     * @param {Object} data - The data to be updated.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If the method is not overridden in a subclass.
     */
    async updateData(data, options = {}) {
        throw new Error('Method "updateData" must be implemented in a subclass');
    }

    /**
     * Patches data in the API.
     * @abstract
     * @param {Object} data - The partial data to be patched.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If the method is not overridden in a subclass.
     */
    async patchData(data, options = {}) {
        throw new Error('Method "patchData" must be implemented in a subclass');
    }

    /**
     * Deletes data from the API.
     * @abstract
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The response data.
     * @throws {Error} If the method is not overridden in a subclass.
     */
    async deleteData(options = {}) {
        throw new Error('Method "deleteData" must be implemented in a subclass');
    }
}

/**
 * Custom error class for API-related errors.
 */
class APIError extends Error {
    /**
     * Creates a new APIError.
     * @param {string} message - The error message.
     * @param {string} code - The error code.
     * @param {number} status - The HTTP status code.
     * @param {Error} [originalError=null] - The original error object.
     * @param {Object} [responseData=null] - The response data.
     */
    constructor(message, code, status, originalError = null, responseData = null) {
        super(message);
        this.name = 'APIError';
        this.code = code;
        this.status = status;
        this.originalError = originalError;
        this.responseData = responseData;
        this.timestamp = new Date();

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, APIError);
        }
    }
}