import fs from "fs"
import csv from "csv-parser"
import { config } from "../src/config.js"
import { connect } from "../src/backend.js"

export async function importSubjects({file, modified, full}) {
  const backend = await connect(config)
  const stream = fs.createReadStream(file)
  const csvTransform = csv({
    separator: "\t",
    headers: ["ppn", "voc", "notation"],
    quote: "",
  })

  if (full) {
    try {
      await backend.batchImport(backend.batchImportRequiresCSV ? stream.pipe(csvTransform) : stream)
    } catch (error) {
      console.error(error)
    }
  } else {
    // Partial import
    await new Promise(resolve => {
      let ppn
      let rows = []
      stream
        .pipe(csvTransform)
        .on("data", row => {
          if (row.ppn === ppn) {
            rows.push(row)
          } else {
            if (ppn) {
              backend.updateRecord(ppn, rows)
            }
            ppn = row.ppn
            rows = [row]
          }
        })
        .on("end", () => {
          if (ppn) {
            backend.updateRecord(ppn, rows)
          }
          resolve()
        })
    })
  }
  if (modified) {
    await backend.updateMetadata({ key: "modified", value: modified })
  }
  await backend.disconnect()
}
