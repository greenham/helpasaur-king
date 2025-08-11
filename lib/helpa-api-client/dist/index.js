"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpaApi = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
/**
 * Helps services connect to the Helpa API.
 */
class HelpaApi {
    /**
     * Constructs a new HelpaApi instance.
     * @param options - The options for configuring the HelpaApi instance.
     * @throws {Error} If any of the required constructor values are missing.
     */
    constructor({ apiHost, apiKey, serviceName }) {
        this.accessToken = null;
        this.apiHost = apiHost;
        this.apiKey = apiKey;
        this.serviceName = serviceName;
        // Throw an error if any of the required constructor values are missing
        if (!this.apiHost || !this.apiKey || !this.serviceName) {
            throw new Error(`HelpaApi constructor requires apiHost, apiKey, and serviceName`);
        }
        this.api = axios_1.default.create({
            baseURL: this.apiHost,
            headers: { "X-Service-Name": serviceName },
        });
        (0, axios_retry_1.default)(this.api, {
            retries: 1000,
            retryDelay: () => 10000,
            onRetry: (retryCount, error, requestConfig) => {
                console.log(`🔴 API Request Error:`, error.toString());
                console.log(`🔁 Retrying call to ${requestConfig?.url} (attempt #${retryCount})`);
            },
        });
    }
    /**
     * Authorizes the service with the API.
     * @returns A promise that resolves to true if the service is authorized successfully, or false otherwise.
     */
    async authorizeService() {
        try {
            const result = await this.api.get(`${this.apiHost}/auth/service`, {
                headers: { Authorization: this.apiKey },
            });
            console.log(`✅ Service authorized with API!`);
            const { token } = result.data;
            this.accessToken = token;
            // Use JWT for all subsequent calls
            this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            return true;
        }
        catch (err) {
            console.error(`🔴 Error authorizing service: ${err.message}`);
            return false;
        }
    }
    /**
     * Retrieves the service configuration from the API.
     * If necessary, it authorizes the service before making the request.
     * @returns The service configuration object, or null if an error occurs.
     */
    async getServiceConfig() {
        try {
            // auth first if necessary
            let authorized = this.accessToken !== null;
            if (!authorized) {
                authorized = await this.authorizeService();
            }
            if (!authorized) {
                throw new Error(`🔴 Unable to authorize service with API!`);
            }
            // console.log(`Fetching ${this.serviceName} config from API...`);
            const response = await this.api.get(`${this.apiHost}/api/configs/${this.serviceName}`);
            // console.log(`✅ Config Retrieved!`);
            return response.data.config;
        }
        catch (err) {
            throw new Error(`🔴 Error fetching service config: ${err.message}`);
        }
    }
    /**
     * Get the axios instance for making custom API calls
     */
    getAxiosInstance() {
        return this.api;
    }
}
exports.HelpaApi = HelpaApi;
//# sourceMappingURL=index.js.map