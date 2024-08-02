#!/usr/bin/env node

import readline from "readline"
import extractSubjects from "../src/extract-subjects.js"

let data = ""

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

rl.on("line", (line) => {
  // ? Data is joined here and split again in `extractSubjects`. Maybe this can be optimized.
  data += `${line}\n`
})

rl.on("close", () => {
  const { ppn, subjects } = extractSubjects(data)
  for (const subject of subjects) {
    console.log(`${ppn}\t${subject.voc}\t${subject.notation}\t${subject.src.join("|")}`)
  }
})
