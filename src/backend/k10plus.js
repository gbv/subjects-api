import fetch from "node-fetch"
import extractSubjects from "../extract-subjects.js"

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

  

}
