// Configuration
import * as dotenv from "dotenv"
dotenv.config()
export const config = {
  port: process.env.PORT || 3141,
  database: process.env.DATABASE || "./subjects.db",
  schemesFile: process.env.SCHEMES || "./vocabularies.json",
  linksFile: process.env.LINKS || "./links.json",
}

import jskos from "jskos-tools"
import fs from "fs"
export const schemes = JSON.parse(fs.readFileSync(config.schemesFile)).map(scheme => new jskos.ConceptScheme(scheme))
export const links = JSON.parse(fs.readFileSync(config.linksFile))

const backendName = process.env.BACKEND || "SQLiteBackend"
import SQLiteBackend from "./backend/sqlite.js"
import PostgreSQLBackend from "./backend/postgres.js"
const backends = [SQLiteBackend, PostgreSQLBackend]
const backendClass = backends.find(b => b.name === backendName)

if (!backendClass) {
  console.error(`Backend ${backendName} not found.`)
  process.exit(1)
}

export const backend = new backendClass(config)

console.log(`Configured ${schemes.length} vocabularies from ${config.schemesFile}. Using ${backend.name}.`)
