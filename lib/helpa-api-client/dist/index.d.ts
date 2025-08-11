import { AxiosInstance } from "axios";
export interface HelpaApiOptions {
    apiHost: string;
    apiKey: string;
    serviceName: string;
}
export interface ServiceConfig {
    [key: string]: any;
}
export interface AuthResponse {
    token: string;
}
/**
 * Helps services connect to the Helpa API.
 */
export declare class HelpaApi {
    private apiHost;
    private apiKey;
    private serviceName;
    private accessToken;
    private api;
    /**
     * Constructs a new HelpaApi instance.
     * @param options - The options for configuring the HelpaApi instance.
     * @throws {Error} If any of the required constructor values are missing.
     */
    constructor({ apiHost, apiKey, serviceName }: HelpaApiOptions);
    /**
     * Authorizes the service with the API.
     * @returns A promise that resolves to true if the service is authorized successfully, or false otherwise.
     */
    authorizeService(): Promise<boolean>;
    /**
     * Retrieves the service configuration from the API.
     * If necessary, it authorizes the service before making the request.
     * @returns The service configuration object, or null if an error occurs.
     */
    getServiceConfig(): Promise<ServiceConfig>;
    /**
     * Get the axios instance for making custom API calls
     */
    getAxiosInstance(): AxiosInstance;
}
//# sourceMappingURL=index.d.ts.map