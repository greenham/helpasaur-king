const axios = require("axios");
const axiosRetry = require("axios-retry");

export default class HelpaApi {
  constructor({ apiHost, apiKey, serviceName }) {
    this.apiHost = apiHost;
    this.apiKey = apiKey;
    this.serviceName = serviceName;
    this.accessToken = null;

    // Throw an error if any of the required constructor values are missing
    if (!this.apiHost || !this.apiKey || !this.serviceName) {
      throw new Error(
        `HelpaApi constructor requires apiHost, apiKey, and serviceName`
      );
    }

    this.api = axios.create({
      baseURL: this.apiHost,
      headers: { authorization: this.apiKey, "X-Service-Name": serviceName },
    });

    axiosRetry(this.api, {
      retries: 1000,
      retryDelay: () => 10000,
      onRetry: (retryCount, error, requestConfig) => {
        console.log(`API Request Error:`, error.toString());
        console.log(
          `Retrying call to ${requestConfig.url} (attempt #${retryCount})`
        );
      },
    });
  }

  async authorizeService() {
    try {
      const result = await this.api.get(`${this.apiHost}/auth/service`);
      console.log(`✅ Service authorized with API!`);
      const { token } = result.data;
      this.accessToken = token;
      // Use JWT for all subsequent calls
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      return true;
    } catch (err) {
      console.error(`🔴 Error authorizing service: ${err.message}`);
      return false;
    }
  }

  async getServiceConfig() {
    try {
      // auth first if necessary
      let authorized = false;
      if (!this.accessToken) {
        authorized = await this.authorizeService();
      }

      if (!authorized) {
        throw new Error(`Unable to authorize service with API!`);
      }

      console.log(`Fetching ${this.serviceName} config from API...`);

      const response = await this.api.get(
        `${this.apiHost}/api/configs/${this.serviceName}`
      );
      console.log(`✅ Config Retrieved!`);
      return Object.assign({}, response.data.config);
    } catch (err) {
      console.error(`🔴 Error fetching service config: ${err.message}`);
      return null;
    }
  }
}
