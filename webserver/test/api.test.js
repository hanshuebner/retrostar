const request = require('supertest')
const app = require('../src/app')

describe('API Endpoint Test', () => {
  it('should return 200 OK and a message', async () => {
    const response = await request(app).get('/api/user')
    expect(response.status).to.equal(200)
    expect(response.body)
      .to.have.property('message')
      .that.equals('Hello, user!')
  })
})
