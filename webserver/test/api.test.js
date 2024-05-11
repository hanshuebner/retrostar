const supertest = require('supertest')
const { expect } = require('chai')
const Koa = require('koa')
const app = require('../src/app')

const server = app.callback() // Create a server from the Koa app
const request = supertest.agent(server) // Use the server with supertest

describe('API Endpoint Test', () => {
  it('should return 200 OK and an array', async () => {
    const response = await request.get('/api/hosts')
    expect(response.status).to.equal(200)
    expect(response.body).to.be.an('array')
  })
})
