import { URL } from "url"
import fetch from "node-fetch"

export default class SPARQLBackend {

  async connect(config) {
    this.base = (new URL(config.database)).toString() // check for valid URL
    this.graph = config.graph || "default"
    this.metadataCache = config.metadata
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

  async coOccurrences({scheme, notation, otherScheme, threshold}) {
    const subject = scheme.uriFromNotation(notation)
    const query = `SELECT ?uri ?voc (COUNT(?record) AS ?freq) FROM <${this.graph}> {`
        + (otherScheme ? `BIND(<${otherScheme.uri}> AS ?voc).` : "")
        + ` ?record <http://purl.org/dc/terms/subject> <${subject}> ;
              <http://purl.org/dc/terms/subject> ?uri .
      ?uri <http://www.w3.org/2004/02/skos/core#inScheme> ?voc .
      FILTER(?uri != <${subject}>)
    } GROUP BY ?uri ?voc`
    + (threshold ? ` HAVING(?freq > ${threshold})` : "")
    + " ORDER BY DESC(?freq)"
    console.log(query)
    return this.sparql(query).then(result => result.map(({uri,voc,freq}) => {
      const concept = this.uri2concept(uri.value)
      concept.inScheme = [{uri:voc}]
      return concept ? { concept, freq } : null
    }).filter(Boolean))
  }

  async subjects({ppn}) {
    const record = `http://uri.gbv.de/document/opac-de-627:ppn:${ppn}`
    return this.sparql(`SELECT ?uri FROM <${this.graph}> { <${record}> <http://purl.org/dc/terms/subject> ?uri }`)
      .then(result => result.map(({uri}) => this.uri2concept(uri.value)).filter(Boolean))
  }

  async updateRecord(/*ppn, rows=[]*/) {
    throw new Error("Not implemented yet") // TODO
  }

  // metadata is not stored persistently with this backend!
  async metadata({ counts = true }) {
    const metadata = this.metadataCache
    if (counts) {
      throw new Error("Not implemented yet (very expensive queries)")
      // metadata.occCount = // SELECT (COUNT(*) AS ?c) FROM <https://uri.gbv.de/graph/kxp-subjects> { [] <http://purl.org/dc/terms/subject> [] }
      // metadata.recCount = // SELECT (COUNT(DISTINCT ?rec) AS ?c) FROM <https://uri.gbv.de/graph/kxp-subjects> { ?rec <http://purl.org/dc/terms/subject> [] }
      // metadata.vocCount = // SELECT (COUNT(DISTINCT ?voc) AS ?c) FROM <https://uri.gbv.de/graph/kxp-subjects> { [] <http://www.w3.org/2004/02/skos/core#inScheme> ?voc }
    }
    return metadata
  }

  async updateMetadata(data) {
    (Array.isArray(data) ? data : [data]).forEach(({key,value}) => this.metadataCache[key] = value)
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
