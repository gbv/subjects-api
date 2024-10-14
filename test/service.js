import assert from "node:assert"

import { config, links, databases } from "../src/config.js"
import { createBackend } from "../src/backend.js"
import { SubjectsService } from "../src/service.js"

// TODO: change config to use temporary database and import test data

const backend = await createBackend(config)

const { schemes } = config
const service = new SubjectsService({backend, schemes, links, databases})

describe("default service", () => {
  it("empty query/response", async () => {
    const res = await service.request({})
    assert.deepEqual(res,[])
  })
})
