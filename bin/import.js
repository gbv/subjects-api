#!/usr/bin/env node

// Parse arguments
let args = process.argv.slice(2)

const full = args.includes("--full")

const modifiedIndex = args.indexOf("--modified")
let modified
if (modifiedIndex !== -1) {
  modified = args[modifiedIndex + 1]
  if (!modified.match(/^\d{4}-\d{2}-\d{2}$/)) {
    modified = null
    console.warn("Warning: --modified parameter needs to be given in format YYYY-MM-DD, will be ignored")
  }
  delete args[modifiedIndex]
  delete args[modifiedIndex + 1]
}

args = args.filter(a => a && a !== "--full")

const unknownArgs = args.filter(a => a.startsWith("--"))

if (unknownArgs.length) {
  console.error("Error: Unknown argument(s)", unknownArgs.join(", "))
  process.exit(1)
}

if (args.length > 1) {
  console.error("Error: Only a single file argument supported")
  process.exit(1)
}

// TODO: Support import from stdin
if (args.length === 0) {
  console.error("Error: No file name given")
  process.exit(1)
}

const file = args[0]

import fs from "fs"

if (!fs.existsSync(file)) {
  console.error(`Error: File ${file} not found`)
  process.exit(1)
}

if (file && !modified) {
  const fileStats = fs.statSync(file)
  modified = fileStats.mtime.toISOString().slice(0, 10)
}

console.log()
console.log(`${full ? "Full" : "Partial"} import with file ${file}, modified ${modified}.`)

import csv from "csv-parser"
import { backend } from "../src/config.js"

(async () => {
  const stream = fs.createReadStream(file)
    .pipe(csv({
      separator: "\t",
      headers: ["ppn", "voc", "notation"],
      quote: "",
    }))

  if (full) {
    try {
      await backend.batchImport(stream)
    } catch (error) {
      console.error(error)
    }
  } else {
    // Partial import
    await new Promise(resolve => {
      let ppn
      let rows = []
      stream
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
})()
