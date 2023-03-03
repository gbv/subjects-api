import { connect, config, schemes, links } from "./config.js"

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

const databaseLink = links.find(l => l.database.uri === database.uri) || {}

// lookup table
const voc2scheme = Object.fromEntries(schemes.map(s => [s.VOC,s]))
schemes.get = voc => voc2scheme[voc]

function extendConcept(c) {
  const scheme = schemes.get(c.voc)
  if (scheme) {
    if (c.uri) {
      const ext = { uri: c.uri, inScheme: [{uri:scheme.uri}] }
      const notation = scheme.notationFromUri(c.uri) 
      if (notation) {
        ext.notation = [notation]
      }
      return ext
    } else if (c.notation) {
      return scheme.conceptFromNotation(c.notation, { inScheme: true })
    }
  }
}

async function createServer() {
  // Connect to backend
  const backend = await connect()

  // this will likely warm up the backend cache as well
  // TODO: This is very slow and delays startup by multiple minutes. Find a better solution.
  // const { recCount, occCount, vocCount } = await backend.metadata()
  // console.log(`Backend contains ${occCount} occurrences from ${recCount} records with ${vocCount} vocabularies.`)

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
    const { member, record } = req.query
    const threshold = parseInt(req.query.threshold) || 0

    let modified
    try {
      const metadata = await backend.metadata({ counts: false })
      modified = metadata.modified
    } catch (error) {
      // ignore
    }

    if (record) {
      var result = []
      if (record.startsWith("http://uri.gbv.de/document/opac-de-627:ppn:")) {
        const ppn = record.split(":").pop()
        result = await backend.subjects({ ppn })
        result = result.map(extendConcept).filter(Boolean)
        if (member) {
          result = result.filter(c => c.uri === member)
        }
        if (req.query.scheme && req.query.scheme != "*") {
          result = result.filter(c => c.inScheme[0].uri === req.query.scheme)
        }
        result = result.map(c => {
          const occ = { database, memberSet: [c], modified }
          if (databaseLink.templateRecord) {
            occ.url = databaseLink.templateRecord.replace("{ppn}",encodeURI(ppn))
          }
          return occ
        })
      }
      return res.json(result)
    }

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
        modified,
        count: parseInt(result.freq),
      }
      if (databaseLink.templateOccurrences && scheme.IKT) {
        occurrence.url = databaseLink.templateOccurrences.replace("{notation}",encodeURI(notation)).replace("{ikt}",scheme.IKT)
      }
      res.json([occurrence])
    } else {
      const result = await backend.coOccurrences({scheme, notation, otherScheme, threshold})
      res.json(result.map(row => {
        let targetScheme = otherScheme
        if (!targetScheme) {
          targetScheme = schemes.get(row.voc)
          if (!targetScheme) {
            return null
          }
        }
        const targetConceptUri = targetScheme.uriFromNotation(row.notation)
        if (!targetConceptUri) {
          return null
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
          modified,
          count: parseInt(row.freq),
        }
        if (databaseLink.templateCoOccurrences && scheme.IKT && targetScheme.IKT) {
          entry.url = databaseLink.templateCoOccurrences.replace("{notation1}",encodeURI(scheme.notationFromUri(member))).replace("{notation2}",encodeURI(row.notation)).replace("{ikt1}", scheme.IKT).replace("{ikt2}", targetScheme.IKT)
        }
        return entry
      }).filter(Boolean))
    }
  })

  // Supported vocabularies
  app.get("/api/voc", async (req, res) => {
    res.json(schemes)
  })

  app.get("/status", async (req, res) => {
    const status = {}
    try {
      const metadata = await backend.metadata({ counts: false })
      status.metadata = metadata
      status.ok = 1
    } catch (error) {
      status.ok = 0
    }
    res.json(status)
  })

  return { app }
}

createServer().then(({ app }) =>
  app.listen(config.port, () => {
    console.log(`Now listening on port ${config.port}`)
  }),
)
