import jskos from "jskos-tools"

export class OccurrencesService {    

  constructor({ backend, schemes, database, links }) {
    this.backend = backend
    this.database = database
    this.links = links.find(l => l.database.uri === database.uri) || {}
    this.schemes = schemes
    const voc2scheme = Object.fromEntries(schemes.map(s => [s.VOC,s]))
    this.schemes.get = voc => voc2scheme[voc]
  }

  async modified() {
    try {
      return (await this.backend.metadata({ counts: false })).modified
    } catch (error) {
      // ignore
    }
  }

  schemeOfConcept(uri) {
    return this.schemes.find(s => s.notationFromUri(uri))
  }

  async request(query) {      
    const { record, member } = query

    if (record) {
      return this.subjects(query)
    }

    const memberScheme = this.schemeOfConcept(member)
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

    // expand backend result to full JSKOS concepts
    result = result.map(c => {
      const scheme = this.schemes.get(c.voc)
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
      count: parseInt(result.freq),
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

    return result.map(row => {
      let targetScheme = otherScheme
      if (!targetScheme) {
        targetScheme = schemes.get(row.voc)
        if (!targetScheme) {
          return null
        }
      }
      const targetConceptUri = targetScheme.uriFromNotation(row.notation)
      if (!targetConceptUri) {
        return null
      }
      const entry = {
        database,
        memberSet: [
          {
            uri: member,
            inScheme: [{ uri: memberScheme.uri }],
          },
          {
            uri: targetScheme.uriFromNotation(row.notation),
            inScheme: [{ uri: targetScheme.uri }],
          },
        ],
        modified,
        count: parseInt(row.freq),
      }
      if (links.templateCoOccurrences && memberScheme.IKT && targetScheme.IKT) {
        entry.url = links.templateCoOccurrences.replace("{notation1}",encodeURI(notation)).replace("{notation2}",encodeURI(row.notation)).replace("{ikt1}", memberScheme.IKT).replace("{ikt2}", targetScheme.IKT)
      }
      return entry
    }).filter(Boolean)
  }
}
