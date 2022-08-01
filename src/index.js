import { db, config, schemes } from "./config.js"

import express from "express"
import jskos from "jskos-tools"

async function createServer() {
  const app = express()
  app.set("json spaces", 2)

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

  // Default route
  app.get("/", async (req, res) => {
    const member = req.query.member
    const scheme = schemes.find(s => {
      return s.notationFromUri(member)
    })
    if (!scheme) {
      return res.json([])
    }
    let otherScheme = null
    if (req.query.scheme && req.query.scheme !== "*") {
      otherScheme = schemes.find(s => jskos.compare(s, { uri: req.query.scheme }))
    }
    const result = await db.prepare(`SELECT b.voc, b.notation, count(*) AS freq FROM subjects AS b JOIN (SELECT ppn FROM subjects WHERE voc = ? AND notation = ?) a ON a.ppn = b.ppn WHERE b.voc ${otherScheme ? "=" : "!="} ? GROUP BY b.voc, b.notation ORDER BY freq DESC LIMIT 10;`).all([scheme._key, scheme.notationFromUri(member), otherScheme ? otherScheme._key : scheme._key])
    res.json(result.map(row => {
      let targetScheme = otherScheme
      if (!targetScheme) {
        targetScheme = schemes.find(s => s._key === row.voc)
        if (!targetScheme) {
          return null
        }
      }
      const entry = {
        // TODO
        database: { uri: "http://uri.gbv.de/database/gvk" },
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
        // TODO
        // url: "https://gso.gbv.de/DB=2.1/CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM=bkl+08.22",
      }
      return entry
    }).filter(Boolean))
  })

  // Supported vocabularies
  app.get("/voc", async (req, res) => {
    res.json(schemes)
  })

  return { app }
}

createServer().then(({ app }) =>
  app.listen(config.port, () => {
    console.log(`Now listening on port ${config.port}`)
  }),
)
