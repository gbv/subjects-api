import { db, config, schemes, links } from "./config.js"

import express from "express"
import jskos from "jskos-tools"

// Value for `database` key for returned occurrences
const database = {
  uri: "http://uri.gbv.de/database/gvk",
  prefLabel: {
    en: "GBV Union Catalogue (GVK)",
    de: "Gemeinsamer Verbundkatalog (GVK)",
  },
}

async function createServer() {
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
    if (otherScheme === undefined) {
      // occurrences
      const notation = scheme.notationFromUri(member)
      const result = await db.prepare("SELECT count(*) AS freq FROM subjects WHERE voc = ? and notation = ?").get([scheme._key, notation])
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
      const link = links.find(({fromScheme}) => scheme.uri === fromScheme.uri)
      if (link) {
        // FIXME: We expect template to only use '{notation}' but it may not do so
        occurrence.url = link.template.replace("{notation}",encodeURI(notation))
      }
      res.json([occurrence])
    } else {
      // co-occurrences
      const result = await db.prepare(`SELECT b.voc, b.notation, count(*) AS freq FROM subjects AS b JOIN (SELECT ppn FROM subjects WHERE voc = ? AND notation = ?) a ON a.ppn = b.ppn WHERE b.voc ${otherScheme ? "=" : "!="} ? GROUP BY b.voc, b.notation HAVING count(*) >= ? ORDER BY freq DESC LIMIT 10;`).all([scheme._key, scheme.notationFromUri(member), otherScheme ? otherScheme._key : scheme._key, threshold])
      res.json(result.map(row => {
        let targetScheme = otherScheme
        if (!targetScheme) {
          targetScheme = schemes.find(s => s._key === row.voc)
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
