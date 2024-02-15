const { Pool } = require('pg')
const memoize = require('memoizee')

const makePool = () =>
  new Pool({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'retrostar',
    port: process.env.PGPORT,
  })

// Middleware function to allocate PostgreSQL database connection and manage transactions
const middleware = async (ctx, next) => {
  const client = makePool()

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

const checkPassword = async (username, password) => {
  const client = makePool()
  const result = await client.query('SELECT check_password($1, $2)', [
    username,
    password,
  ])
  if (!result.rows[0].check_password) {
    return null
  }
  const user = await client.query(
    'SELECT id, name AS username FROM "user" WHERE name = $1',
    [username]
  )
  client.end()
  return user.rows[0]
}

const touchHosts = async (usersAndHosts) => {
  const db = makePool()
  usersAndHosts.forEach(([username, hostname]) =>
    db.query('SELECT update_host($1, $2)', [username, hostname])
  )
  db.end()
}

const getHosts = async () => {
  const client = makePool()
  const result = await client.query(
    `SELECT h.*, u.name AS owner
     FROM host h
              JOIN "user" u ON u.id = h.user_id
     WHERE h.last_seen > NOW() - INTERVAL \'1 minute\'
     ORDER BY u.name, h.mac_address::varchar`
  )
  client.end()
  return result.rows
}

const updateHost = async (username, macAddress, hostname, description) => {
  const client = makePool()
  const result = await client.query(
    `UPDATE host
     SET name        = $1,
         description = $2
     WHERE mac_address = $3
       AND user_id = (SELECT id
                      FROM "user"
                      WHERE name = $4);`,
    [hostname, description, macAddress, username]
  )
  client.end()
  return result.rows
}

module.exports = {
  middleware,
  getConfigurationByInstallKey,
  getInstallKeyByUser,
  checkPassword,
  touchHosts,
  getHosts,
  updateHost,
}
