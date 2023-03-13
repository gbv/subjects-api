import jskos from "jskos-tools"

export class OccurrencesService {

  constructor({ backend, schemes, databases, links }) {
    this.backend = backend
    this.database = databases[0]
    this.links = links.find(l => l.database.uri === this.database.uri) || {}

    // TODO: https://github.com/gbv/jskos-tools/issues/38
    this.schemes = schemes
    this.schemes.findByConceptUri = uri => this.schemes.find(s => s.notationFromUri(uri))
    this.schemes.findByUri = uri => this.schemes.find(s => s.uri === uri)
    this.schemes.findByVOC = voc => this.schemes.find(s => s.VOC === voc)
  }

  async modified() {
    try {
      return (await this.backend.metadata({ counts: false })).modified
    } catch (error) {
      // ignore
    }
  }

  async request(query) {
    const { record, member } = query

    if (record) {
      return this.subjects(query)
    }

    const memberScheme = this.schemes.findByConceptUri(member)
    if (!memberScheme) {
      return []
    }

    if (query.scheme) {
      let otherScheme = null
      if (query.scheme != "*") {
        otherScheme = this.schemes.find(s => jskos.compare(s, { uri: query.scheme }))
        if (!otherScheme) {
          return []
        }
      }
      const threshold = parseInt(query.threshold) || 0
      return this.coOccurrences({ member, memberScheme, otherScheme, threshold})
    } else {
      return this.occurrences({ member, memberScheme })
    }
  }

  async subjects(query) {
    if (!query.record?.startsWith("http://uri.gbv.de/document/opac-de-627:ppn:")) {
      return []
    }
    const ppn = query.record.split(":").pop()

    var result = await this.backend.subjects({ ppn })

    // expand backend result to full JSKOS concepts (TODO: backend may return full JSKOS concept)
    result = result.map(c => {
      const scheme = this.schemes.findByVOC(c.voc)
      if (scheme) {
        if (c.uri) {
          const notation = scheme.notationFromUri(c.uri)
          return {
            uri: c.uri,
            inScheme: [{uri:scheme.uri}],
            ...(notation && {notation: [notation]}),
          }
        } else if (c.notation) {
          return scheme.conceptFromNotation(c.notation, { inScheme: true })
        }
      }
    }).filter(Boolean)

    // optionally filter concepts
    if (query.member) {
      result = result.filter(c => c.uri === query.member)
    }
    if (query.scheme && query.scheme != "*") {
      result = result.filter(c => c.inScheme[0].uri === query.scheme)
    }

    // turn concepts into occurrences
    const modified = await this.modified()
    const { database, links } = this
    return result.map(c => {
      const occ = { memberSet: [c], database, modified }
      if (links.templateRecord) {
        occ.url = links.templateRecord.replace("{ppn}",encodeURI(ppn))
      }
      return occ
    })
  }

  async occurrences({ member, memberScheme }) {
    const notation = memberScheme.notationFromUri(member)
    const result = await this.backend.occurrences({ scheme: memberScheme, notation })
    const occ = {
      database: this.database,
      memberSet: [
        {
          uri: member,
          notation: [notation],
          inScheme: [{ uri: memberScheme.uri }],
        },
      ],
      modified: await this.modified(),
      count: parseInt(result.freq) || 0,
    }
    if (this.links.templateOccurrences && memberScheme.IKT) {
      occ.url = this.links.templateOccurrences.replace("{notation}",encodeURI(notation)).replace("{ikt}",memberScheme.IKT)
    }
    return [occ]
  }

  async coOccurrences({member, memberScheme, otherScheme, threshold}) {
    const notation = memberScheme.notationFromUri(member)

    const result = await this.backend.coOccurrences({scheme: memberScheme, notation, otherScheme, threshold})
    const modified = await this.modified()
    const { schemes, links, database } = this

    return result.map(({ freq, concept, voc, notation }) => {
      if (concept) { // backend returns full JSKOS concept
        if (!otherScheme) {
          otherScheme = schemes.findByUri(concept.inScheme[0].uri)
        }
        notation = otherScheme.notationFromUri(concept.uri)
      } else { // backend returns voc and notation to build concept from
        if (!otherScheme) {
          otherScheme = schemes.findByVOC(voc)
        }
        const uri = otherScheme?.uriFromNotation(notation)
        if (!uri) {
          return null
        }
        concept = {
          uri,
          inScheme: [{ uri: otherScheme.uri }],
        }
      }

      const entry = {
        database,
        memberSet: [
          {
            uri: member,
            inScheme: [{ uri: memberScheme.uri }],
          },
          concept,
        ],
        modified,
        count: parseInt(freq) || 0,
      }
      if (links.templateCoOccurrences && memberScheme.IKT && otherScheme?.IKT) {
        entry.url = links.templateCoOccurrences.replace("{notation1}",encodeURI(notation)).replace("{notation2}",encodeURI(notation)).replace("{ikt1}", memberScheme.IKT).replace("{ikt2}", otherScheme.IKT)
      }
      return entry
    }).filter(Boolean)
  }
}
