const { Pool } = require('pg')

const pool = new Pool({
  connectionTimeoutMillis: 5000,
  max: 100,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || 'retrostar',
  port: process.env.PGPORT,
})

const connect = async () => pool.connect()

// Middleware function to allocate PostgreSQL database connection and manage transactions
const withClient = async (handler) => {
  const client = await connect()
  let result = null
  try {
    await client.query('BEGIN')
    result = await handler(client)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.release()
  }
  return result
}

const middleware = async (ctx, next) =>
  withClient(async (client) => {
    ctx.db = client
    await next()
  })

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

const checkPassword = async (username, password) =>
  withClient(async (client) => {
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
    return user.rows[0]
  })

const checkPasswordResetKey = async (key) =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT password_reset_key_expires_at < NOW() AS expired, NOW(), password_reset_key_expires_at
       FROM "user"
       WHERE password_reset_key = $1`,
      [key]
    )
    if (result.rows.length === 0) {
      console.log('invalid password reset key:', key)
      return false
    } else if (result.rows[0].expired) {
      console.log('expired password reset key:', result.rows[0])
      return false
    } else {
      return true
    }
  })

const resetPassword = async (key, password) =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT reset_password_with_key($1, $2)`,
      [key, password]
    )
    return result.rows.length > 0
  })

const setPassword = async (username, password) =>
  withClient(async (client) => {
    const result = await client.query(`SELECT set_password($1, $2)`, [
      username,
      password,
    ])
    return result.rows.length > 0
  })

const touchHosts = async (usersAndHosts) =>
  withClient(async (client) =>
    usersAndHosts.forEach(([username, hostname]) =>
      client.query('SELECT update_host($1, $2)', [username, hostname])
    )
  )

const getActiveHosts = async () =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT h.*, u.name AS owner
       FROM host h
                JOIN "user" u ON u.id = h.user_id
       WHERE h.last_seen > NOW() - INTERVAL \'5 minutes\'
         AND h.protocols IS NOT NULL
         AND NOT blacklisted
       ORDER BY u.name, h.mac_address::VARCHAR`
    )
    return result.rows
  })

const getAllHosts = async () =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT h.*, u.name AS owner
       FROM host h
                JOIN "user" u ON u.id = h.user_id
       ORDER BY u.name, h.mac_address::VARCHAR`
    )
    return result.rows
  })

const updateHost = async (
  username,
  macAddress,
  { name, description, hardware, software }
) =>
  withClient(async (client) => {
    const result = await client.query(
      `UPDATE host
       SET name        = COALESCE($3, name),
           description = COALESCE($4, description),
           hardware    = COALESCE($5, hardware),
           software    = COALESCE($6, software)
       WHERE mac_address = $1
         AND user_id = (SELECT id
                        FROM "user"
                        WHERE name = $2);`,
      [macAddress, username, name, description, hardware, software]
    )
    return result.rows
  })

const updateHostProtocols = async (macAddress, protocols) =>
  withClient(async (client) => {
    const result = await client.query(
      `UPDATE host
       SET protocols = $2
       WHERE mac_address = $1`,
      [macAddress, protocols]
    )
    return result.rows
  })

const getProtocols = async () =>
  withClient(async function (client) {
    const result = await client.query(
      `SELECT *
       FROM protocol`
    )
    return result.rows.reduce((protocols, { number, name, description }) => {
      protocols[number] = {
        name: name || number.toString(16).toUpperCase(),
        description,
      }
      return protocols
    }, {})
  })

const getUserId = async (username) =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT id
       FROM "user"
       WHERE name = $1`,
      [username]
    )
    return result.rows[0]?.id
  })

module.exports = {
  connect,
  withClient,
  middleware,
  getConfigurationByInstallKey,
  getInstallKeyByUser,
  checkPassword,
  checkPasswordResetKey,
  resetPassword,
  setPassword,
  touchHosts,
  getAllHosts,
  getActiveHosts,
  updateHost,
  updateHostProtocols,
  getProtocols,
  getUserId,
}
