/**
 * Example of a concrete implementation that extends APIBase.
 * This shows how a subclass should implement the abstract methods.
 */
class BootAPI extends APIBase {
    constructor(dynamicGrid, config) {
        super(dynamicGrid, config);
        this.resourcePath = 'boot';
    }

    /**
     * Fetches users data from the API.
     * @param {Object} [params={}] - Query parameters.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The response data.
     */
    async fetchData(params = {}, options = {}) {
        return this.request('GET', this.resourcePath, {
            params,
            ...options
        });
    }

    /**
     * Fetches a specific user by ID.
     * @param {string|number} id - The user ID.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The user data.
     */
    async fetchById(id, options = {}) {
        return this.request('GET', `${this.resourcePath}/${id}`, options);
    }

    /**
     * Creates a new user.
     * @param {Object} userData - The user data.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The created user data.
     */
    async postData(userData, options = {}) {
        return this.request('POST', this.resourcePath, {
            data: userData,
            ...options
        });
    }

    /**
     * Updates an existing user.
     * @param {string|number} id - The user ID.
     * @param {Object} userData - The updated user data.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The updated user data.
     */
    async updateData(id, userData, options = {}) {
        return this.request('PUT', `${this.resourcePath}/${id}`, {
            data: userData,
            ...options
        });
    }

    /**
     * Partially updates an existing user.
     * @param {string|number} id - The user ID.
     * @param {Object} userData - The partial user data.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The updated user data.
     */
    async patchData(id, userData, options = {}) {
        return this.request('PATCH', `${this.resourcePath}/${id}`, {
            data: userData,
            ...options
        });
    }

    /**
     * Deletes a user.
     * @param {string|number} id - The user ID.
     * @param {Object} [options={}] - Additional request options.
     * @returns {Promise<Object>} The response data.
     */
    async deleteData(id, options = {}) {
        return this.request('DELETE', `${this.resourcePath}/${id}`, options);
    }
}