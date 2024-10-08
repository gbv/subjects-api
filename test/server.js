import chai from "./chai.js"
import assert from "node:assert"

const { appStarted } = await import("../server.js")
const app = await appStarted

describe("server", () => {
  it("/ should return HTML",
    () => chai.request.execute(app).get("/")
      .then(res => {
        assert.equal(res.status,200)
      }))
  it("/status should return JSON",
    () => chai.request.execute(app).get("/status")
      .then(res => {
        assert.equal(res.status,200)
        assert.ok(res.body.ok)
      }))
  it("/voc should return vocabularies",
    () => chai.request.execute(app).get("/voc")
      .then(res => {
        assert.equal(res.status,200)
        assert.equal(res.body.length,16)
      }))
  it("/databases should return databases",
    () => chai.request.execute(app).get("/databases")
      .then(res => {
        assert.equal(res.status,200)
        assert.equal(res.body.length,1)
      }))
})
