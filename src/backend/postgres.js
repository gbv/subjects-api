
import pg from "pg"
const { Pool } = pg

export default class PostgreSQLBackend {

  // Establish connection to backend or throw error
  constructor(config) {
    this.db = new Pool({
      user: "stefan" || config.user,
      password: "" || config.password,
      host: "localhost" || config.host,
      database: "subjects" || config.database,
      port: 5432 || config.port,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 0,
    })

    ;(async () => {
      const client = await this.db.connect()
      try {
        const res = await client.query("SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';")
        if (res.rowCount === 0) {
          await client.query(`
            CREATE TABLE subjects (
              ppn TEXT NOT NULL,
              voc TEXT NOT NULL,
              notation TEXT NOT NULL
            );

            CREATE INDEX idx_notation on subjects (notation);
            CREATE INDEX idx_ppn on subjects (ppn);

            CREATE TABLE metadata (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
          `)
        }
      } finally {
        client.release()
      }
    })()
    this.name = `PostgreSQL database ${config.database} (port ${config.port})`
  }

  async disconnect() {
    await this.db.end()
  }

  async occurrences({scheme, notation}) {
    const client = await this.db.connect()
    try {
      const results = await client.query("SELECT count(*) AS freq FROM subjects WHERE voc = $1 and notation = $2", [scheme.VOC, notation])
      return results.rows
    } catch (error) {
      console.log(error)
      return []
    } finally {
      client.release()
    }
  }

  async coOccurrences({scheme, notation, otherScheme, threshold}) {
    const client = await this.db.connect()
    try {
      const results = await client.query(`SELECT b.voc, b.notation, count(*) AS freq FROM subjects AS b JOIN (SELECT ppn FROM subjects WHERE voc = $1 AND notation = $2) a ON a.ppn = b.ppn WHERE b.voc ${otherScheme ? "=" : "!="} $3 GROUP BY b.voc, b.notation HAVING count(*) >= $4 ORDER BY freq DESC LIMIT 10;`, [scheme.VOC, notation, otherScheme ? otherScheme.VOC : scheme.VOC, threshold])
      return results.rows
    } catch (error) {
      console.log(error)
      return []
    } finally {
      client.release()
    }
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

    const client = await this.db.connect()
    try {
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
      await client.query("ROLLBACK")
      console.log(e)
    } finally {
      client.release()
    }
  }

  async batchImport(data) {
    const client = await this.db.connect()

    try {

      // Drop indexes to recreate later
      console.time("drop indexes/data")
      await client.query("DROP INDEX IF EXISTS idx_notation;")
      await client.query("DROP INDEX IF EXISTS idx_ppn;")
      await client.query("TRUNCATE subjects;")
      console.timeEnd("drop indexes/data")
      // await client.query("BEGIN")

      const bulkInsert = async (rows) => {
        const keys = Object.keys(rows[0])
        let valueStr = ""
        let valueArray = []
        let valueIndex = 1
        for (let row of rows) {
          if (valueStr) {
            valueStr += ","
          }
          valueStr += "(" + keys.map((value, index) => `$${valueIndex + index}`) + ")"
          valueArray = valueArray.concat(keys.map((value) => row[value]))
          valueIndex += keys.length
        }
        await client.query(`INSERT INTO subjects (${keys.join(",")}) VALUES ${valueStr}`, valueArray)
      }

      let rows = []
      let inserted = 0
      console.time("insert")

      for await (const row of data) {
        rows.push(row)
        if (rows.length === 2000) {
          inserted += rows.length
          await bulkInsert(rows)
          rows = []
          if (inserted % 1000000 === 0) {
            // await client.query("COMMIT")
            console.timeEnd("insert")
            console.log(inserted)
            console.time("insert")
            // await client.query("BEGIN")
          }
        }
      }

      inserted += rows.length
      await bulkInsert(rows)
      // await client.query("COMMIT")
      console.timeEnd("insert")
      console.log(inserted)
      // Recreate indexes
      console.time("recreate indexes")
      await client.query("CREATE INDEX idx_notation on subjects (notation);")
      await client.query("CREATE INDEX idx_ppn on subjects (ppn);")
      console.timeEnd("recreate indexes")


    } catch (error) {
      console.log(error)
      // await client.query("ROLLBACK")
    } finally {
      client.release()
    }
  }

  async metadata() {
    const client = await this.db.connect()
    try {
      const { occcount } = (await client.query("SELECT COUNT(*) AS occCount FROM subjects")).rows[0]
      const { reccount } = (await client.query("SELECT COUNT(DISTINCT ppn) AS recCount FROM subjects")).rows[0]
      const { voccount } = (await client.query("SELECT COUNT(DISTINCT voc) AS vocCount FROM subjects")).rows[0]
      return { occCount: occcount, recCount: reccount, vocCount: voccount }
    } catch (error) {
      console.log(error)
      return []
    } finally {
      client.release()
    }
  }

  async updateMetadata(data) {
    if (!Array.isArray(data)) {
      data = [data]
    }
    const client = await this.db.connect()
    try {
      const updateQuery = "INSERT INTO metadata VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2"
      for (const row of data) {
        await client.query(updateQuery, [row.key, row.value])
      }
    } catch (error) {
      console.log(error)
    } finally {
      client.release()
    }
  }
}
