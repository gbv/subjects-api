import SQLiteBackend from "./backend/sqlite.js"
import SPARQLBackend from "./backend/sparql.js"
import Neo4jBackend from "./backend/neo4j.js"
import K10PlusBackend from "./backend/k10plus.js"

const backends = [SQLiteBackend, SPARQLBackend, Neo4jBackend, K10PlusBackend]

export const createBackend = async (config) => {
  const backendClass = backends.find(b => b.name === `${config.backend}Backend`)
  if (!backendClass) {
    throw new Error(`${config.backend} backend not found.`)
  }

  const backend = new backendClass()
    
  // createBackend immediately, but clients will still need to await createBackend()
  const backendConnectPromise = backend.connect(config)
  await backendConnectPromise

  console.log(`Configured ${config.schemes.length} vocabularies from ${config.schemesFile}. Using ${backend.name}.`)
  return backend
}
