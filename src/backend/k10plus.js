import fetch from "node-fetch"
import extractSubjects from "../extract-subjects.js"

export default class K10PlusBackend {

  async subjects({ ppn, dbkey = "opac-de-627" }) { 
    const url = `${this.api}/?id=${dbkey}:ppn:${ppn}&format=pp`
    try {
      const response = await fetch(url)
      const picaPlusData = await response.text()
      const { ppn: ppn_, subjects } = extractSubjects(picaPlusData)
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

  async occurrences() {
    return []
  }

  async coOccurrences() {
    return []
  }

  async records() {
    return []
  }

  async metadata() {
    return {}
  }

  async connect({ database = "https://unapi.k10plus.de" }) {
    this.api = database
    this.name = `K10Plus via ${this.api}`
  }
  async disconnect() {}

}
