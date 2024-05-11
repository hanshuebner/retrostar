const util = require('node:util')
const exec = util.promisify(require('node:child_process').exec)
const path = require('path')

const migrateScript = path.join(__dirname, '../../../db/migrate.sh')

process.env.PGDATABASE = `retrostar-test-${process.pid}`

const up = async () => {
  await exec(`createdb ${process.env.PGDATABASE}`)
  await exec(`${migrateScript} danger:reset`)
  await exec(`${migrateScript} up`)
}

const down = async () => {
  await exec(`dropdb ${process.env.PGDATABASE}`)
}

module.exports = { up, down }
