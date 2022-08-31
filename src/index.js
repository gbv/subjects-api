import { backend, config, schemes, links } from "./config.js"

import express from "express"
import jskos from "jskos-tools"

// Value for `database` key for returned occurrences
const database = {
  uri: "http://uri.gbv.de/database/opac-de-627",
  prefLabel: {
    en: "K10plus Union Catalogue",
    de: "K10plus-Verbundkatalog",
  },
}

async function createServer() {

  // this will likely warm up the backend cache as well
  const { recCount, occCount, vocCount } = await backend.metadata()
  console.log(`Backend contains ${occCount} occurrences from ${recCount} records with ${vocCount} vocabularies.`)

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
    res.render("index", {
      config,
    })
  })

  // API route
  app.get("/api", async (req, res) => {
    const member = req.query.member
    const threshold = parseInt(req.query.threshold) || 0
    const scheme = schemes.find(s => {
      return s.notationFromUri(member)
    })
    if (!scheme) {
      return res.json([])
    }
    let otherScheme
    if (req.query.scheme === "*") {
      otherScheme = null
    } else if (req.query.scheme) {
      otherScheme = schemes.find(s => jskos.compare(s, { uri: req.query.scheme }))
      // If scheme is not found or not supported, return empty result
      if (!otherScheme) {
        return res.json([])
      }
    }
    const notation = scheme.notationFromUri(member)
    if (otherScheme === undefined) {
      const result = await backend.occurrences({ scheme, notation })
      const occurrence = {
        database,
        memberSet: [
          {
            uri: member,
            notation: [notation],
            inScheme: [{ uri: scheme.uri }],
          },
        ],
        count: parseInt(result.freq),
      }
      const link = links.find(l => l.database.uri === database.uri && l.fromScheme.uri === scheme.uri)
      if (link) {
        // FIXME: We expect template to only use '{notation}' but it may not do so
        occurrence.url = link.template.replace("{notation}",encodeURI(notation))
      }
      res.json([occurrence])
    } else {
      const result = await backend.coOccurrences({scheme, notation, otherScheme, threshold})
      res.json(result.map(row => {
        let targetScheme = otherScheme
        if (!targetScheme) {
          targetScheme = schemes.find(s => s.VOC === row.voc)
          if (!targetScheme) {
            return null
          }
        }
        const entry = {
          database,
          memberSet: [
            {
              uri: member,
              inScheme: [{ uri: scheme.uri }],
            },
            {
              uri: targetScheme.uriFromNotation(row.notation),
              inScheme: [{ uri: targetScheme.uri }],
            },
          ],
          count: parseInt(row.freq),
          // TODO: url
        }
        return entry
      }).filter(Boolean))
    }
  })

  // Supported vocabularies
  app.get("/api/voc", async (req, res) => {
    res.json(schemes)
  })

  return { app }
}

createServer().then(({ app }) =>
  app.listen(config.port, () => {
    console.log(`Now listening on port ${config.port}`)
  }),
)
