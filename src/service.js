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
        otherScheme = this.getScheme(query.scheme)
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

  getScheme(uri) {
    return this.schemes.find(scheme => jskos.compare(scheme, { uri }))
  }

  async subjects(query) {
    const ppns = (query.record || "").split("|")
      .filter(uri => uri.startsWith("http://uri.gbv.de/document/opac-de-627:ppn:"))
      .map(uri => uri.split(":").pop())

    const schemes = (!query.scheme || query.scheme === "*") ? [] : query.scheme.split("|")
     
    const result = []
    for (let ppn of ppns) {
      const concepts = await this.backend.subjects({ ppn })
      // expand backend result to full JSKOS concepts (TODO: backend may return full JSKOS concept)
      concepts.map(c => {
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
      }).filter(Boolean).filter(c => {
        if (schemes.length) {
          return schemes.indexOf(c.inScheme[0].uri) >= 0
        } else {
          return c
        }
      }).forEach(c => result.push(c))
    }

    return result
  }

  async records({ subject, limit }) { // TODO: format
    subject = (subject || "").split("|").map(uri => {
      const scheme = this.schemes.findByConceptUri(uri)
      return scheme ? { scheme: scheme.VOC, notation: scheme.notationFromUri(uri) } : null
    }).filter(s => s && s.scheme && s.notation)

    if (subject.length) {
      const { scheme, notation } = subject[0]
      const result = await this.backend.records({ scheme, notation, limit })
      return result.map(({ppn}) => `http://uri.gbv.de/document/opac-de-627:ppn:${ppn}`)
    } else {
      return []
    }
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
      // We can't override `otherScheme` here because if it's not given in the request, 
      // it will stay the same even if there are concepts of multiple schemes in the result set.
      let targetScheme = otherScheme
      if (concept) { // backend returns full JSKOS concept
        if (!targetScheme) {
          targetScheme = schemes.findByUri(concept.inScheme[0].uri)
        }
        notation = targetScheme.notationFromUri(concept.uri)
      } else { // backend returns voc and notation to build concept from
        if (!targetScheme) {
          targetScheme = schemes.findByVOC(voc)
        }
        const uri = targetScheme?.uriFromNotation(notation)
        if (!uri) {
          return null
        }
        concept = {
          uri,
          inScheme: [{ uri: targetScheme.uri }],
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
      if (links.templateCoOccurrences && memberScheme.IKT && targetScheme?.IKT) {
        entry.url = links.templateCoOccurrences.replace("{notation1}", encodeURI(notation)).replace("{notation2}", encodeURI(notation)).replace("{ikt1}", memberScheme.IKT).replace("{ikt2}", targetScheme.IKT)
      }
      return entry
    }).filter(Boolean)
  }
}
