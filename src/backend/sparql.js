import { URL } from "url"

export default class SPARQLBackend {

  async connect(config) {
    this.base = (new URL(config.database)).toString() // check for valid URL
    this.graph = config.graph || "default"
    this.metadata = config.metadata
    this.schemes = config.schemes
    this.name = `SPARQL Endpoint ${this.base} graph ${this.graph}`
  }

  async disconnect() { }

  async occurrences({scheme, notation}) {
    const uri = scheme.uriFromNotation(notation)
    return this.sparql(`SELECT (COUNT(?record) AS ?freq) FROM <${this.graph}> {
      ?record <http://purl.org/dc/terms/subject> <${uri}> }`)
      .then(result => ({ freq: result[0].freq.value }))
  }

  async coOccurrences(/*{scheme, notation, otherScheme, threshold}*/) {
    // const uri = scheme.uriFromNotation(notation)
    throw new Error("Not implemented yet") // TODO
    // requires inScheme-triples
  }

  async subjects({ppn}) {
    const record = `http://uri.gbv.de/document/opac-de-627:ppn:${ppn}`
    return this.sparql(`SELECT ?uri FROM <${this.graph}> { <${record}> <http://purl.org/dc/terms/subject> ?uri }`)
      .then(result => result.map(({uri}) => this.uri2concept(uri.value)).filter(Boolean))
  }

  async updateRecord(/*ppn, rows=[]*/) {
    throw new Error("Not implemented yet") // TODO
  }  

  async metadata({ counts = true } = {}) {
    const { metadata } = this
    if (counts) {
      throw new Error("Not implemented yet") // TODO
      // metadata.occCount =
      // metadata.recCount =
      // metadata.vocCount =
    }
    return metadata
  }

  async updateMetadata(/*data*/) {
    throw new Error("Not implemented yet") // TODO
  }

  // Utility methods

  async sparql(query) {
    query = query.replace("FROM <default>","")
    return fetch(`${this.base}?${new URLSearchParams({query})}`)
      .then(res => res.json())
      .then(res => res.results?.bindings)
  }

  uri2concept(uri) {
    for (let scheme of this.schemes) {
      const notation = scheme.notationFromUri(uri)
      if (notation) {
        return {notation, voc: scheme.VOC}
      }
    }
  }
}
