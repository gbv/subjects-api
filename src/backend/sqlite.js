import Database from "better-sqlite3"
import fs from "fs"

export default class SQLiteBackend {

  // Establish connection to backend or throw error
  async connect(config) {
    const file = config.database
    // create database file if not exist or throw an error
    if (!fs.existsSync(file)) {
      const db = new Database(file)
      db.exec(`
CREATE TABLE subjects (
  ppn TEXT NOT NULL,
  voc TEXT NOT NULL,
  notation TEXT NOT NULL
);
DELETE FROM subjects;
CREATE INDEX idx_notation on subjects (notation);
CREATE INDEX idx_ppn on subjects (ppn);

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`)
    }
    this.db = new Database(file)
    this.db.pragma("journal_mode = WAL")
    this.name = `SQLite database ${file}`
  }

  async disconnect() {
    this.db.close()
  }

  async occurrences({scheme, notation}) {
    return this.db.prepare("SELECT count(*) AS freq FROM subjects WHERE voc = ? and notation = ?").get([scheme.VOC, notation])
  }

  async coOccurrences({scheme, notation, otherScheme, threshold}) {
    return this.db.prepare(`SELECT b.voc, b.notation, count(*) AS freq FROM subjects AS b JOIN (SELECT ppn FROM subjects WHERE voc = ? AND notation = ?) a ON a.ppn = b.ppn WHERE b.voc ${otherScheme ? "=" : "!="} ? GROUP BY b.voc, b.notation HAVING count(*) >= ? ORDER BY freq DESC LIMIT 10;`).all([scheme.VOC, notation, otherScheme ? otherScheme.VOC : scheme.VOC, threshold])
  }

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
      for (const row of data) insert.run(row)
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
}
