// Configuration
import * as dotenv from "dotenv"
dotenv.config()
export const config = {
  port: process.env.PORT || 3141,
  database: process.env.DATABASE || "./subjects.db",
  schemesFile: process.env.SCHEMES || "./schemes.json",
  linksFile: process.env.LINKS || "./links.json",
}

import jskos from "jskos-tools"
import fs from "fs"
export const schemes = JSON.parse(fs.readFileSync(config.schemesFile)).map(scheme => new jskos.ConceptScheme(scheme))
export const links = JSON.parse(fs.readFileSync(config.linksFile))

import Database from "better-sqlite3"
export const db = new Database(config.database, {
  readonly: true,
  fileMustExist: true,
})

console.log(`Configured ${schemes.length} vocabularies from ${config.schemesFile}. Loaded datatabase from ${config.database}.`)
