
import pg from "pg"
import pgcs from "pg-copy-streams"
const copyFrom = pgcs.from
const { Pool } = pg

export default class PostgreSQLBackend {

  // Establish connection to backend or throw error
  async connect(config) {
    this.db = new Pool({
      user: config.db.user,
      password: config.db.password || "",
      host: config.db.host || "localhost",
      database: config.db.database || "subjects",
      port: config.db.port || 5432,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 0,
    })
    this.db.on("connect", () => {
      console.log("Connected to PostgreSQL database")
    })
    this.db.on("error", (error) => {
      console.error("Lost connection to PostgreSQL database", error.message)
    })

    let client
    try {
      client = await this.db.connect()
      const res = await client.query("SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';")
      if (res.rowCount === 0) {
        await client.query(`
          CREATE TABLE subjects (
            ppn TEXT NOT NULL,
            voc TEXT NOT NULL,
            notation TEXT
          );

          CREATE INDEX idx_notation on subjects (notation);
          CREATE INDEX idx_ppn on subjects (ppn);

          CREATE TABLE metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
        `)
      }
    } catch (error) {
      console.error(error)
    } finally {
      client && client.release()
    }
    this.name = `PostgreSQL database ${config.database} (port ${config.port})`
  }

  async disconnect() {
    await this.db.end()
  }

  async occurrences({scheme, notation}) {
    let client
    try {
      client = await this.db.connect()
      const results = await client.query("SELECT count(*) AS freq FROM subjects WHERE voc = $1 and notation = $2", [scheme.VOC, notation])
      return results.rows
    } catch (error) {
      console.log(error)
      return []
    } finally {
      client && client.release()
    }
  }

  async coOccurrences({scheme, notation, otherScheme, threshold}) {
    let client
    try {
      client = await this.db.connect()
      const results = await client.query(`SELECT b.voc, b.notation, count(*) AS freq FROM subjects AS b JOIN (SELECT ppn FROM subjects WHERE voc = $1 AND notation = $2) a ON a.ppn = b.ppn WHERE b.voc ${otherScheme ? "=" : "!="} $3 GROUP BY b.voc, b.notation HAVING count(*) >= $4 ORDER BY freq DESC LIMIT 10;`, [scheme.VOC, notation, otherScheme ? otherScheme.VOC : scheme.VOC, threshold])
      return results.rows
    } catch (error) {
      console.log(error)
      return []
    } finally {
      client && client.release()
    }
  }


  async subjects({ppn}) {
    throw new Error(`Subjects ${ppn} not implemented yet`) // TODO
  }

  async updateRecord(ppn, rows=[]) {
    const deleteAllQuery = "DELETE FROM subjects WHERE ppn = $1"
    const deleteOneQuery = "DELETE FROM subjects WHERE ppn = $1 AND voc = $2"
    const insertQuery = "INSERT INTO subjects (ppn, voc, notation) VALUES ($1, $2, $3)"

    // Sort rows (deletion first)
    rows.sort((a, b) => {
      if (!a.notation && b.notation || !a.voc && b.voc) {
        return -1
      }
      return 1
    })

    let client
    try {
      client = await this.db.connect()
      await client.query("BEGIN")

      for (const row of rows) {
        if (!row.voc) {
          await client.query(deleteAllQuery, [ppn])
        } else if (!row.notation) {
          await client.query(deleteOneQuery, [ppn, row.voc])
        } else {
          await client.query(insertQuery, [ppn, row.voc, row.notation])
        }
      }

      await client.query("COMMIT")
    } catch (e) {
      client && await client.query("ROLLBACK")
      console.log(e)
    } finally {
      client && client.release()
    }
  }

  get batchImportRequiresCSV() {
    return false
  }

  async batchImport(data) {
    let client
    try {
      client = await this.db.connect()

      // Drop indexes to recreate later
      console.time("drop indexes/data")
      await client.query("DROP INDEX IF EXISTS idx_notation;")
      await client.query("DROP INDEX IF EXISTS idx_ppn;")
      await client.query("TRUNCATE subjects;")
      console.timeEnd("drop indexes/data")
      // await client.query("BEGIN")

      console.time("importing data")
      await new Promise((resolve, reject) => {
        // TODO: Can we require data files to be UTF8 so that we don't need to add ENCODING 'SQL_ASCII'?
        // Note: QUOTE E`\b` is a workaround because we don't want any quote character. See https://stackoverflow.com/a/20402913.
        const stream = client.query(copyFrom("COPY subjects FROM STDIN DELIMITER E'\t' ENCODING 'SQL_ASCII' CSV QUOTE E'\b' NULL AS ''"))
        data.on("error", reject)
        stream.on("error", reject)
        stream.on("finish", resolve)
        data.pipe(stream)
      })
      console.timeEnd("importing data")

      // Recreate indexes
      console.log("import complete, recreating indexes...")
      console.time("recreate indexes")
      await client.query("CREATE INDEX idx_notation on subjects (notation);")
      await client.query("CREATE INDEX idx_ppn on subjects (ppn);")
      console.timeEnd("recreate indexes")


    } catch (error) {
      console.log(error)
      // await client.query("ROLLBACK")
    } finally {
      client && client.release()
    }
  }

  async metadata({ counts = true } = {}) {
    let client
    try {
      client = await this.db.connect()
      let result = {}
      if (counts) {
        const { occcount } = (await client.query("SELECT COUNT(*) AS occCount FROM subjects")).rows[0]
        const { reccount } = (await client.query("SELECT COUNT(DISTINCT ppn) AS recCount FROM subjects")).rows[0]
        const { voccount } = (await client.query("SELECT COUNT(DISTINCT voc) AS vocCount FROM subjects")).rows[0]
        result = { occCount: occcount, recCount: reccount, vocCount: voccount }
      }
      const metadata = Object.fromEntries((await client.query("SELECT key, value FROM metadata")).rows.map(({key,value}) => [key,value]))
      return { ...metadata, ...result }
    } finally {
      client && client.release()
    }
  }

  async updateMetadata(data) {
    if (!Array.isArray(data)) {
      data = [data]
    }
    let client
    try {
      client = await this.db.connect()
      const updateQuery = "INSERT INTO metadata VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2"
      for (const row of data) {
        await client.query(updateQuery, [row.key, row.value])
      }
    } catch (error) {
      console.log(error)
    } finally {
      client && client.release()
    }
  }
}
