#!/usr/bin/env node

/**
 * Import monitors to Uptime Kuma via Socket.io API
 * Since the backup/restore feature doesn't properly handle json-query fields,
 * this script creates monitors directly via the API
 */

const io = require("socket.io-client")
const fs = require("fs")
const path = require("path")
const readline = require("readline")

// Configuration
const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_URL || "http://localhost:3333"
const CONFIG_FILE = process.argv[2]

if (!CONFIG_FILE) {
  console.error("Usage: node import-via-api.js <config-file>")
  console.error("Example: node import-via-api.js app-services.dev.json")
  process.exit(1)
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function askQuestion(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function main() {
  // Read configuration file
  const configPath = path.resolve(CONFIG_FILE)
  if (!fs.existsSync(configPath)) {
    console.error(`Configuration file not found: ${configPath}`)
    process.exit(1)
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
  console.log(
    `\n📁 Loaded configuration with ${config.monitorList.length} monitors`
  )

  // Get credentials
  console.log(`\n🔐 Connecting to Uptime Kuma at ${UPTIME_KUMA_URL}`)
  const username = await askQuestion("Username: ")
  const password = await askQuestion("Password: ")
  rl.close()

  // Connect to Uptime Kuma
  console.log("\n🔌 Connecting to Uptime Kuma...")
  const socket = io(UPTIME_KUMA_URL)

  // Wait for connection
  await new Promise((resolve, reject) => {
    socket.on("connect", () => {
      console.log("✅ Connected to Uptime Kuma")
      resolve()
    })

    socket.on("connect_error", (error) => {
      console.error("❌ Connection failed:", error.message)
      reject(error)
    })

    // Set timeout
    setTimeout(() => {
      reject(new Error("Connection timeout"))
    }, 10000)
  })

  // Login
  console.log("\n🔑 Authenticating...")
  await new Promise((resolve, reject) => {
    socket.emit(
      "login",
      {
        username,
        password,
        token: "",
      },
      (response) => {
        if (response.ok) {
          console.log("✅ Authentication successful")
          resolve()
        } else {
          console.error("❌ Authentication failed:", response.msg)
          reject(new Error(response.msg))
        }
      }
    )
  })

  // Get existing monitors to avoid duplicates
  console.log("\n📋 Fetching existing monitors...")
  const existingMonitors = await new Promise((resolve) => {
    socket.emit("getMonitorList", (response) => {
      if (response) {
        const monitors = Object.values(response)
        console.log(`Found ${monitors.length} existing monitors`)
        resolve(monitors)
      } else {
        resolve([])
      }
    })
  })

  const existingNames = new Set(existingMonitors.map((m) => m.name))

  // Create monitors
  console.log("\n🚀 Creating monitors...")
  let created = 0
  let skipped = 0
  let failed = 0

  for (const monitor of config.monitorList) {
    // Check if monitor already exists
    if (existingNames.has(monitor.name)) {
      console.log(`⏭️  Skipping "${monitor.name}" (already exists)`)
      skipped++
      continue
    }

    // Prepare monitor object for API - only include essential fields
    const apiMonitor = {
      name: monitor.name,
      type: monitor.type,
      url: monitor.url,
      method: monitor.method || "GET",
      interval: monitor.interval || 60,
      retryInterval: monitor.retryInterval || 60,
      maxretries: monitor.maxretries || 3,
      timeout: monitor.timeout || 48,
      active: monitor.active !== false,
      accepted_statuscodes: monitor.accepted_statuscodes || ["200-299"],
      expiryNotification: monitor.expiryNotification || false,
      ignoreTls: monitor.ignoreTls || false,
      maxredirects: monitor.maxredirects || 10,
      description: monitor.description || "",

      // JSON Query specific fields - these are critical for json-query monitors
      jsonPath: monitor.jsonPath || null,
      expectedValue: monitor.expectedValue || null,

      // Other essential fields
      hostname: monitor.hostname || null,
      port: monitor.port || null,
      keyword: monitor.keyword || null,
      invertKeyword: monitor.invertKeyword || false,
      dns_resolve_type: monitor.dns_resolve_type || "A",
      dns_resolve_server: monitor.dns_resolve_server || "1.1.1.1",
      proxyId: monitor.proxyId || null,
      notificationIDList: monitor.notificationIDList || {},

      // Basic auth if needed
      authMethod: monitor.authMethod || null,
      basic_auth_user: monitor.basic_auth_user || null,
      basic_auth_pass: monitor.basic_auth_pass || null,

      // Headers if needed
      headers: monitor.headers || null,
      body: monitor.body || null,

      // Don't include fields that might not exist in the database
      // forceInactive, weight, and many others are removed
      upsideDown: monitor.upsideDown || false,
      packetSize: monitor.packetSize || 56,
      resendInterval: monitor.resendInterval || 0,
    }

    // Create monitor
    try {
      const result = await new Promise((resolve, reject) => {
        socket.emit("add", apiMonitor, (response) => {
          if (response.ok) {
            resolve(response)
          } else {
            reject(new Error(response.msg || "Unknown error"))
          }
        })
      })

      console.log(`✅ Created "${monitor.name}" (ID: ${result.monitorID})`)
      created++
    } catch (error) {
      console.error(`❌ Failed to create "${monitor.name}": ${error.message}`)
      failed++
    }
  }

  // Summary
  console.log("\n📊 Import Summary:")
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📈 Total: ${config.monitorList.length}`)

  // Disconnect
  socket.disconnect()
  console.log("\n👋 Disconnected from Uptime Kuma")
  process.exit(failed > 0 ? 1 : 0)
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Error:", error.message)
  process.exit(1)
})
