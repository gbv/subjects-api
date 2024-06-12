import * as dotenv from "dotenv"

const NODE_ENV = process.env.NODE_ENV || "development"

// use default configuration when testing
if (NODE_ENV !== "test") {
  dotenv.config()
}

import { readFile } from "node:fs/promises"
const fileUrl = new URL("../package.json", import.meta.url)
const { name, version, homepage } = JSON.parse(await readFile(fileUrl, "utf8"))

export const config = {
  env: NODE_ENV,
  name, version, homepage,
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

import path from "path"
for (let name of ["schemesFile","linksFile"]) {
  if (!path.isAbsolute(config[name])) {
    config[name] = path.resolve(process.env.PWD, config[name])
  }
}

const readJSON = file => JSON.parse(fs.readFileSync(file))

config.schemes = readJSON(config.schemesFile).map(scheme => new jskos.ConceptScheme(scheme))
export const links = readJSON(config.linksFile)

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
import Neo4jBackend from "./backend/neo4j.js"

const backends = [SQLiteBackend, PostgreSQLBackend, SPARQLBackend,Neo4jBackend]
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
