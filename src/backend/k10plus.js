import fs from "fs"
import fetch from "node-fetch"

// Load extraction rules
const vocabularies = JSON.parse(fs.readFileSync("vocabularies.json", "utf8")).reduce((acc, curr) => {
  acc[curr.PICA] = [curr.VOC, new RegExp(curr.ID), new RegExp(curr.SRC)]
  return acc
}, {})

export default class K10PlusBackend {

  constructor({ api = "https://unapi.k10plus.de", defaultDatabase = "opac-de-627" } = {}) {
    this.api = api
    this.defaultDatabase = defaultDatabase
  }

  async subjects({ ppn, database = this.defaultDatabase }) { 
    const url = `${this.api}/?id=${database}:ppn:${ppn}&format=pp`
    try {
      const response = await fetch(url)
      const picaPlusData = await response.text()
      const { ppn: ppn_, subjects } = this._extractSubjects(picaPlusData)
      if (ppn !== ppn_) {
        return []
      }
      return subjects
    } catch (error) {
      // TODO: API needs error handling.
      console.error(`Error fetching data from ${url}`, error)
      return []
    }
  }

  _extractSubjects(data) {
    let ppn
    const subjects = []
    // TODO: Code was migrated from Perl (https://github.com/gbv/k10plus-subjects/blob/main/extract-subjects.pl) to JavaScript using an LLM; needs to be checked and cleaned up
    for (const line of data.split("\n")) {
      const seen = new Set()

      // Iterate fields
      line.split("\x1E").forEach((fieldLine) => {
        const [field, rest] = fieldLine.split(/ (.*)/s, 2)
        const sf = rest ? rest.split("$").filter(Boolean) : []

        // PPN should be one of the first fields
        if (field === "003@") {
          ppn = sf[0].substring(1)
          return
        }

        // Handle occurrence ranges
        let fieldKey = field
        if (/^(044[KL])/.test(field)) { // GND 044[KL]/00-99
          fieldKey = "044K/00-99 044L/00-99"
        } else if (/^045D\/(..)/.test(field) && RegExp.$1 <= 48) { // STW 045D/00-48
          fieldKey = "045D/00-48"
        }

        // Extract from subject fields
        const spec = vocabularies[fieldKey]
        if (!spec) {
          return
        }

        const [voc, idPattern, srcPattern] = spec
        let id
        const src = []

        sf.forEach((subField) => {
          if (idPattern.test(subField)) {
            id = subField.match(idPattern)[1]
          } else if (srcPattern.test(subField)) {
            src.push(subField.match(srcPattern)[1])
          }
        })

        if (id) {
          const row = `${voc}\t${id}\t${src.join("|")}`

          // Remove duplicates (they may still exist if source is ignored)
          if (!seen.has(row)) {
            subjects.push({
              voc,
              notation: id,
            })
            seen.add(row)
          }
        }
      })
    }
    return {
      ppn,
      subjects,
    }
  }

}
