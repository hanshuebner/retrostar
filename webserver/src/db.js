const { Pool } = require('pg')

// Middleware function to allocate PostgreSQL database connection and manage transactions
const middleware = async (ctx, next) => {
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

const getConfigurationByInstallKey = async (client, installKey) => {
  const result = await client.query(
    'SELECT u.name, oc.port_number, oc.certificate, oc.private_key FROM openvpn_configuration oc JOIN "user" u ON u.id = oc.user_id WHERE install_key = $1',
    [installKey]
  )

  return result.rows[0]
}

const getInstallKeyByUser = async (client, username) => {
  const result = await client.query(
    'SELECT oc.install_key FROM "user" u JOIN openvpn_configuration oc ON oc.user_id = u.id WHERE u.name = $1 LIMIT 1',
    [username]
  )

  return result.rows[0]?.install_key
}

module.exports = {
  middleware,
  getConfigurationByInstallKey,
  getInstallKeyByUser,
}
