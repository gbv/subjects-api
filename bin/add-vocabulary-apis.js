/**
 * Only run via `npm run add-vocabulary-apis` in root folder.
 */

import fs from "node:fs/promises"
import { config } from "../src/config.js"

const vocabularies = JSON.parse(await fs.readFile(config.schemesFile))
const uris = vocabularies.map(v => v.uri).filter(Boolean)

const bartoc = await (await fetch(`https://bartoc.org/api/voc?uri=${uris.map(encodeURIComponent).join("|")}`)).json()

for (const vocab of vocabularies) {
  const api = bartoc.find(s => s.uri === vocab.uri)?.API
  vocab.API = api || []
  if (api?.length) {
    console.log(`Added API for ${vocab.VOC}`)
  }
}

await fs.writeFile(config.schemesFile, JSON.stringify(vocabularies, null, 2))
