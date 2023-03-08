// Configuration
import * as dotenv from "dotenv"
dotenv.config()
export const config = {
  port: process.env.PORT || 3141,
  backend: process.env.BACKEND || "SQLite", 
  database: process.env.DATABASE || "./subjects.db",
  graph: process.env.GRAPH || "default",
  db: {
    name: process.env.DB_NAME || process.env.DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
  },
  schemesFile: process.env.SCHEMES || "./vocabularies.json",
  linksFile: process.env.LINKS || "./links.json",
}

import jskos from "jskos-tools"
import fs from "fs"

config.schemes = JSON.parse(fs.readFileSync(config.schemesFile)).map(scheme => new jskos.ConceptScheme(scheme))
export const links = JSON.parse(fs.readFileSync(config.linksFile))

// Supported databases (only K10plus so far)
export const databases = [{
  uri: "http://uri.gbv.de/database/opac-de-627",
  prefLabel: {
    en: "K10plus Union Catalogue",
    de: "K10plus-Verbundkatalog",
  },
}]

import SQLiteBackend from "./backend/sqlite.js"
import PostgreSQLBackend from "./backend/postgres.js"
import SPARQLBackend from "./backend/sparql.js"

const backends = [SQLiteBackend, PostgreSQLBackend, SPARQLBackend]
const backendClass = backends.find(b => b.name === `${config.backend}Backend`)

if (!backendClass) {
  console.error(`${config.backend} backend not found.`)
  process.exit(1)
}

export const backend = new backendClass()
// Connect immediately, but clients will still need to await connect()
const backendConnectPromise = backend.connect(config)
export const connect = async () => {
  await backendConnectPromise
  console.log(`Configured ${config.schemes.length} vocabularies from ${config.schemesFile}. Using ${backend.name}.`)
  return backend
}
