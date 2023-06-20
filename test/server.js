import chai from "chai"
import chaiHttp from "chai-http"
chai.use(chaiHttp)
import assert from "node:assert"

const { appStarted } = await import("../server.js")
const app = await appStarted

describe("server", () => {
  it("/ should return HTML",
    () => chai.request(app).get("/")
      .then(res => {
        assert.equal(res.status,200)
      }))
  it("/status should return JSON",
    () => chai.request(app).get("/status")
      .then(res => {
        assert.equal(res.status,200)
        assert.ok(res.body.ok)
      }))
  it("/voc return vocabularies",
    () => chai.request(app).get("/voc")
      .then(res => {
        assert.equal(res.status,200)
        assert.equal(res.body.length,14)
      }))
})
