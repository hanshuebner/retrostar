const { Pool } = require('pg')

// Middleware function to allocate PostgreSQL database connection and manage transactions
const allocateDBConnection = async (ctx, next) => {
  const client = new Pool({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'retrostar',
    port: process.env.PGPORT,
  })

  try {
    await client.query('BEGIN')
    ctx.db = client
    await next()
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error in transaction:', error)
    ctx.status = 500
    ctx.body = 'Internal Server Error'
  } finally {
    await client.end()
  }
}

module.exports = allocateDBConnection
