import neo4j from "neo4j-driver-lite"

export default class Neo4jBackend {

  async connect(config) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password),
      { disableLosslessIntegers: true },
    )
    this.name = config.name || "Neo4j database"
    const opt = config.database ? { database: config.database } : {}
    this.readSession = this.driver.session({ ...opt, defaultAccessMode: neo4j.session.READ })
  }

  async disconnect() {
    return this.driver.close()
  }

  async readQuery(query, vars) {
    return this.readSession.run(query, vars)
      .then(result => result.records.map(r => r.toObject()))
  }

  async occurrences({scheme, notation}) {
    const query = "MATCH (t:title)-[]->(n:$scheme) WHERE n.notation = $notation RETURN count(t) AS freq"
    return this.readQuery(query, { scheme, notation })
  }

  async coOccurrences({scheme, notation, otherScheme, threshold}) {
    // TODO: threshold
    const query = "MATCH (t:title)-[]->(n:$scheme) WHERE n.notation = $notation MATCH (t)-[]->(m:$otherScheme) RETURN LABELS(m), m.notation, count(m) AS freq"
    return this.readQuery(query, { scheme, notation, otherScheme })
  }

  async subjects({ppn}) {
    // TODO: how do we know which label of n is the vocabulary?
    const query = "MATCH (t:title)-[]->(n) WHERE t.ppn = $ppn RETURN LABELS(n), n.notation"
    return this.readQuery(query, { ppn })
  }

  async records({scheme, notation, limit}) { 
    limit = limit > 0 && limit <= 100 ? limit : 10
    const query = `MATCH (t:title)-[]->(n:$scheme) WHERE n.notation=$notation RETURN t.ppn LIMIT $limit`
    return this.readQuery(query, {scheme, notation, limit})
  }

/*
  async updateRecord(ppn, rows=[]) {
    const deleteAll = this.db.prepare("DELETE FROM subjects WHERE ppn = ?")
    const deleteOne = this.db.prepare("DELETE FROM subjects WHERE ppn = @ppn AND voc = @voc")
    const insert = this.db.prepare("INSERT INTO subjects (ppn, voc, notation) VALUES (@ppn, @voc, @notation)")

    // Sort rows (deletion first)
    rows.sort((a, b) => {
      if (!a.notation && b.notation || !a.voc && b.voc) {
        return -1
      }
      return 1
    })

    this.db.transaction(() => {
      for (const row of rows) {
        if (!row.voc) {
          deleteAll.run(ppn)
        } else if (!row.notation) {
          deleteOne.run({ ...row, ppn })
        } else {
          insert.run({ ...row, ppn })
        }
      }
    })()
  }

  get batchImportRequiresCSV() {
    return true
  }

  async batchImport(data) {
    // Drop indexes to recreate later
    try {
      this.db.exec("DROP INDEX idx_notation;")
      this.db.exec("DROP INDEX idx_ppn;")
    } catch (error) {
      // Ignore (can occur when previous batch import was canceled and indexes were already dropped)
    }
    this.db.exec("DELETE FROM subjects;")
    const insert = this.db.prepare("INSERT INTO subjects VALUES (@ppn, @voc, @notation)")
    const insertMany = this.db.transaction((data) => {
      for (const row of data) {
        insert.run(row)
      }
    })
    return new Promise((resolve, reject) => {
      let results = []
      let inserted = 0
      const insertResults = () => {
        insertMany(results)
        inserted += results.length
        results = []
        console.log(`${inserted} rows inserted.`)
      }
      if (Array.isArray(data)) {
        reject("Error in SQLite batchImport: Array import not yet supported.")
      } else if (data.on) {
        // Assume a stream and wrap inserts into a biiig transaction
        this.db.transaction(() => {
          data
            .on("data", (row) => {
              results.push(row)
              if (results.length >= 10000000) {
                insertResults()
              }
            })
            .on("end", () => {
              insertResults()
              // Recreate indexes
              this.db.exec("CREATE INDEX idx_notation on subjects (notation);")
              this.db.exec("CREATE INDEX idx_ppn on subjects (ppn);")
              resolve()
            })
        })()
      } else {
        reject("Error in SQLite batchImport: Unknown or unsupported data format")
      }
    })
  }

  async metadata({ counts = true } = {}) {
    let result = {}
    if (counts) {
      const { occCount } = await this.db.prepare("SELECT COUNT(*) AS occCount FROM subjects").get()
      const { recCount } = await this.db.prepare("SELECT COUNT(DISTINCT ppn) AS recCount FROM subjects").get()
      const { vocCount } = await this.db.prepare("SELECT COUNT(DISTINCT voc) AS vocCount FROM subjects").get()
      result = { occCount, recCount, vocCount }
    }

    const metadata = Object.fromEntries(await this.db.prepare("SELECT key, value FROM metadata").all().map(({key,value}) => [key,value]))

    return { ...metadata, ...result }
  }

  async updateMetadata(data) {
    if (!Array.isArray(data)) {
      data = [data]
    }
    const update = this.db.prepare("INSERT INTO metadata VALUES (@key, @value) ON CONFLICT (key) DO UPDATE SET value = @value")
    data.forEach(row => update.run(row))
  }

  */
}
