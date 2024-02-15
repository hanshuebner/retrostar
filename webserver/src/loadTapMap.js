const fs = require('fs')
const path = require('path')

const directory = '/var/run/retrostar/clients'

const readTapFile = (file) =>
  fs.readFileSync(path.join(directory, file), { encoding: 'utf8' }).trim()

const loadTapMap = () => {
  const tapMap = {}
  fs.readdirSync(directory).forEach(
    (file) => (tapMap[file] = readTapFile(file))
  )
  return tapMap
}

module.exports = loadTapMap
