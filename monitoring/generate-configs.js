#!/usr/bin/env node

/**
 * Generator for Uptime Kuma monitoring configurations
 * Creates both dev (app-services.dev.json) and prod (app-services.prod.json) configs
 * from a common template to ensure consistency and reduce maintenance
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Production server configuration
// This should be the actual server IP/hostname where services are running,
// not the GitHub Pages domain
const PROD_SERVER = "146.190.132.20"; // DigitalOcean droplet IP

// Get ports from env with defaults matching .env.sample
const PORTS = {
  API: process.env.API_SERVER_EXTERNAL_PORT || "3001",
  DISCORD: process.env.DISCORD_HEALTH_PORT || "3010",
  TWITCH: process.env.TWITCH_HEALTH_PORT || "3011",
  RACEBOT: process.env.RACEBOT_HEALTH_PORT || "3012",
  WS_RELAY: process.env.WEBSOCKET_RELAY_SERVER_PORT || "3003",
  RUNNER_WATCHER: process.env.TWITCH_WEBHOOK_LISTENER_PORT || "3002",
  MONGO_EXPRESS: process.env.MONGO_EXPRESS_PORT || "8081",
  WEB_APP: process.env.WEB_PUBLIC_EXTERNAL_PORT || "3000",
};

// Service definitions with environment-specific configurations
const SERVICES = [
  {
    name: "API Server",
    icon: "🔌",
    description: "Express API server health check",
    type: "json-query",
    jsonPath: "status",
    expectedValue: "healthy",
    dev: {
      url: `http://host.docker.internal:${PORTS.API}/health`,
    },
    prod: {
      url: "https://api.helpasaur.com/health",
      expiryNotification: true,
    },
  },
  {
    name: "Discord Bot",
    icon: "💬",
    description: "Discord bot health check",
    type: "json-query",
    jsonPath: "status",
    expectedValue: "healthy",
    dev: {
      url: `http://host.docker.internal:${PORTS.DISCORD}/health`,
    },
    prod: {
      url: `http://${PROD_SERVER}:${PORTS.DISCORD}/health`,
    },
  },
  {
    name: "Twitch Bot",
    icon: "📺",
    description: "Twitch bot health check",
    type: "json-query",
    jsonPath: "status",
    expectedValue: "healthy",
    dev: {
      url: `http://host.docker.internal:${PORTS.TWITCH}/health`,
    },
    prod: {
      url: `http://${PROD_SERVER}:${PORTS.TWITCH}/health`,
    },
  },
  {
    name: "Runner Watcher",
    icon: "👁️",
    description: "Runner watcher stream monitoring service",
    type: "json-query",
    jsonPath: "status",
    expectedValue: "healthy",
    dev: {
      url: `http://host.docker.internal:${PORTS.RUNNER_WATCHER}/health`,
    },
    prod: {
      url: "https://rw.helpasaur.com/health",
      expiryNotification: true,
    },
  },
  {
    name: "Race Bot",
    icon: "🏁",
    description: "Weekly race bot health check",
    type: "json-query",
    jsonPath: "status",
    expectedValue: "healthy",
    dev: {
      url: `http://host.docker.internal:${PORTS.RACEBOT}/health`,
    },
    prod: {
      url: `http://${PROD_SERVER}:${PORTS.RACEBOT}/health`,
    },
  },
  {
    name: "WebSocket Relay",
    icon: "🔄",
    description: "WebSocket relay for inter-service communication",
    type: "json-query",
    jsonPath: "status",
    expectedValue: "healthy",
    dev: {
      url: `http://host.docker.internal:${PORTS.WS_RELAY}/health`,
    },
    prod: {
      url: `http://${PROD_SERVER}:${PORTS.WS_RELAY}/health`,
    },
  },
  {
    name: "Mongo Express",
    icon: "🗄️",
    description: "MongoDB web interface",
    type: "http",
    accepted_statuscodes: ["401"],
    dev: {
      url: `http://host.docker.internal:${PORTS.MONGO_EXPRESS}`,
    },
    prod: {
      url: `http://${PROD_SERVER}:${PORTS.MONGO_EXPRESS}`,
    },
  },
  {
    name: "Web App",
    icon: "🌐",
    type: "http",
    dev: {
      url: `http://host.docker.internal:${PORTS.WEB_APP}`,
      description: "React web app dev server",
    },
    prod: {
      url: "https://helpasaur.com",
      expiryNotification: true,
      description: "React web app on GitHub Pages",
    },
  },
];

/**
 * Create a monitor configuration object
 */
function createMonitor(service, env) {
  const envConfig = service[env] || {};

  // Use service-level URL if no environment-specific URL is provided
  const url = envConfig.url || service.url;

  // Merge service-level defaults with environment-specific overrides
  const monitor = {
    name: `${service.icon} ${envConfig.displayName || service.name}`,
    type: service.type || envConfig.type || "http",
    url: url,
    method: "GET",
    hostname: null,
    port: null,
    maxretries: 3,
    weight: 2000,
    active: 1,
    forceInactive: false,
    timeout: 48,
    interval: 60,
    retryInterval: 60,
    resendInterval: 0,
    keyword: null,
    invertKeyword: false,
    expiryNotification: envConfig.expiryNotification || false,
    ignoreTls: false,
    upsideDown: false,
    packetSize: 56,
    maxredirects: 10,
    accepted_statuscodes: service.accepted_statuscodes ||
      envConfig.accepted_statuscodes || ["200-299"],
    dns_resolve_type: "A",
    dns_resolve_server: "1.1.1.1",
    proxyId: null,
    notificationIDList: {},
    tags: [],
    maintenance: false,
  };

  // Add remaining common fields - matching Uptime Kuma's export format
  monitor.mqttTopic = null;
  monitor.mqttSuccessMessage = null;
  monitor.databaseQuery = null;
  monitor.authMethod = monitor.authMethod || null;
  monitor.grpcUrl = null;
  monitor.grpcProtobuf = null;
  monitor.grpcMethod = null;
  monitor.grpcServiceName = null;
  monitor.grpcEnableTls = false;
  monitor.radiusCalledStationId = null;
  monitor.radiusCallingStationId = null;
  monitor.game = null;
  monitor.gamedigGivenPortOnly = true;
  monitor.httpBodyEncoding = null;

  // Add JSON query fields if present
  if (service.jsonPath || envConfig.jsonPath) {
    monitor.jsonPath = service.jsonPath || envConfig.jsonPath;
  } else {
    monitor.jsonPath = null;
  }
  if (service.expectedValue || envConfig.expectedValue) {
    monitor.expectedValue = service.expectedValue || envConfig.expectedValue;
  } else {
    monitor.expectedValue = null;
  }

  // Kafka fields
  monitor.kafkaProducerTopic = null;
  monitor.kafkaProducerBrokers = null;
  monitor.kafkaProducerSsl = false;
  monitor.kafkaProducerAllowAutoTopicCreation = false;
  monitor.kafkaProducerMessage = null;
  monitor.kafkaProducerSaslOptions = null;

  // Auth fields
  monitor.headers = null;
  monitor.body = null;
  monitor.grpcBody = null;
  monitor.grpcMetadata = null;
  monitor.basic_auth_user = null;
  monitor.basic_auth_pass = null;
  monitor.oauth_client_id = null;
  monitor.oauth_client_secret = null;
  monitor.oauth_token_url = null;
  monitor.oauth_scopes = null;
  monitor.oauth_auth_method = null;
  monitor.pushToken = null;
  monitor.databaseConnectionString = null;
  monitor.radiusUsername = null;
  monitor.radiusPassword = null;
  monitor.radiusSecret = null;
  monitor.mqttUsername = null;
  monitor.mqttPassword = null;
  monitor.authWorkstation = null;
  monitor.authDomain = null;
  monitor.tlsCa = null;
  monitor.tlsCert = null;
  monitor.tlsKey = null;

  monitor.screenshot = null;
  monitor.includeSensitiveData = true;
  monitor.description = envConfig.description || service.description;

  return monitor;
}

/**
 * Generate configuration for an environment
 */
function generateConfig(env) {
  // Create monitor list
  const monitorList = SERVICES.map((service) => createMonitor(service, env));

  return {
    version: "1.23.16",
    notificationList: [],
    tagList: [],
    monitorList,
  };
}

// Generate both configurations
const devConfig = generateConfig("dev");
const prodConfig = generateConfig("prod");

// Write configuration files
const devPath = path.join(__dirname, "app-services.dev.json");
const prodPath = path.join(__dirname, "app-services.prod.json");

fs.writeFileSync(devPath, JSON.stringify(devConfig, null, 4));
fs.writeFileSync(prodPath, JSON.stringify(prodConfig, null, 4));

console.log("✅ Generated monitoring configurations:");
console.log(`   - ${devPath}`);
console.log(`   - ${prodPath}`);
console.log(`\n📊 Services configured: ${SERVICES.length}`);
