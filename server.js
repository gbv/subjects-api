import { connect, config, links, databases } from "./src/config.js"
import { OccurrencesService } from "./src/service.js"
const { schemes } = config

import express from "express"

async function createServer() {
  // Connect to backend
  const backend = await connect()

  // this will likely warm up the backend cache as well
  // TODO: This is very slow and delays startup by multiple minutes. Find a better solution.
  // const { recCount, occCount, vocCount } = await backend.metadata()
  // console.log(`Backend contains ${occCount} occurrences from ${recCount} records with ${vocCount} vocabularies.`)

  const service = new OccurrencesService({backend, schemes, links, databases})

  const app = express()
  app.set("json spaces", 2)

  // Configure view engine to render EJS templates.
  app.set("views", "./views")
  app.set("view engine", "ejs")
  app.use(express.static("public"))

  // Headers
  app.use((req, res, next) => {
    if (req.headers.origin) {
      // Allow all origins by returning the request origin in the header
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin)
    } else {
      // Fallback to * if there is no origin in header
      res.setHeader("Access-Control-Allow-Origin", "*")
    }
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    res.setHeader("Access-Control-Allow-Methods", "GET")
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Count, Link", "coli-ana-backend")
    next()
  })

  // Root path for static page
  app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html")
    res.render("index", { ...config })
  })

  // Delegate main API route to OccurrencesService
  app.get(["/occurrences","/api"], async (req, res) => {
    res.json(await service.request(req.query))
  })

  // Supported vocabularies
  app.get(["/voc","/api/voc"], async (req, res) => {
    res.json(schemes)
  })

  // Supported databases
  app.get("/databases", async (req, res) => {
    res.json(databases)
  })

  app.get("/status", async (req, res) => {
    try {
      const metadata = await backend.metadata({ counts: false })
      res.json({metadata, ok:1})
    } catch (error) {
      res.json({ok: 0})
    }
  })

  return { app }
}

createServer().then(({ app }) =>
  app.listen(config.port, () => {
    console.log(`Now listening on port ${config.port}`)
  }),
)
