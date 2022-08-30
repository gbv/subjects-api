import Database from "better-sqlite3"
import fs from "fs"

export default class SQLiteBackend {

  // Establish connection to backend or throw error
  constructor(config) {
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
    this.db = new Database(file, { readonly: true })
    this.name = `SQLite database ${file}`
  }

  async occurrences({scheme, notation}) {
    return this.db.prepare("SELECT count(*) AS freq FROM subjects WHERE voc = ? and notation = ?").get([scheme.VOC, notation])
  }

  async coOcurrences({scheme, notation, otherScheme, threshold}) {
    return this.db.prepare(`SELECT b.voc, b.notation, count(*) AS freq FROM subjects AS b JOIN (SELECT ppn FROM subjects WHERE voc = ? AND notation = ?) a ON a.ppn = b.ppn WHERE b.voc ${otherScheme ? "=" : "!="} ? GROUP BY b.voc, b.notation HAVING count(*) >= ? ORDER BY freq DESC LIMIT 10;`).all([scheme.VOC, notation, otherScheme ? otherScheme.VOC : scheme.VOC, threshold])
  }

  async metadata() {
    const { occCount } = await this.db.prepare("SELECT COUNT(*) AS occCount FROM subjects").get()
    const { recCount } = await this.db.prepare("SELECT COUNT(DISTINCT ppn) AS recCount FROM subjects").get()
    const { vocCount } = await this.db.prepare("SELECT COUNT(DISTINCT voc) AS vocCount FROM subjects").get()

    const metadata = Object.fromEntries(await this.db.prepare("SELECT key, value FROM metadata").all().map(({key,value}) => [key,value]))

    return { ...metadata, recCount, occCount, vocCount }
  }
}
