const supertest = require('supertest')
const { expect } = require('chai')
const app = require('../src/app')
const path = require('node:path')

const server = app.callback() // Create a server from the Koa app
const request = supertest.agent(server) // Use the server with supertest

describe('Article and Image CRUD Test', () => {
  let articleId
  const imageName1 = 'cat.jpg'
  const imageName2 = 'butterfly.jpg'
  const username = 'test'
  const password = 'test'

  before(async () => {
    const result = await request
      .post('/auth/login')
      .send({ username, password })
  })

  it('should create a new article', async () => {
    const response = await request
      .post('/api/article')
      .send({ content: 'Test article content' })

    expect(response.status).to.equal(201)
    expect(response.body).to.have.property('id')

    articleId = response.body.id
  })

  it('should upload an image to the article', async () => {
    const filePath = path.join(__dirname, `fixtures/${imageName1}`)

    const response = await request
      .post(`/api/image/${articleId}`)
      .attach('image', filePath)

    expect(response.status).to.equal(201)
  })

  it('should delete the uploaded image', async () => {
    const response = await request.delete(
      `/api/image/${articleId}/${imageName1}`
    )

    expect(response.status).to.equal(204)
  })

  it('should confirm the image was deleted', async () => {
    const response = await request.get(`/api/image/${articleId}/${imageName1}`)

    expect(response.status).to.equal(404)
  })

  it('should upload a second image to the article', async () => {
    const filePath = path.join(__dirname, `fixtures/${imageName2}`)

    const response = await request
      .post(`/api/image/${articleId}`)
      .attach('image', filePath)

    expect(response.status).to.equal(201)
  })

  it('should delete the article', async () => {
    const response = await request.delete(`/api/article/${articleId}`)

    expect(response.status).to.equal(204)
  })

  it('should confirm the second image was deleted when the article was deleted', async () => {
    const response = await request.get(`/api/image/${articleId}/${imageName2}`)

    expect(response.status).to.equal(404)
  })
})
