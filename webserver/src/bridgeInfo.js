const util = require('util')
const loadTapMap = require('./loadTapMap')
const db = require('./db')
const exec = util.promisify(require('child_process').exec)

const getBridgeNodes = async () => {
  const { stdout } = await exec('bridge fdb show')
  return stdout
    .split('\n')
    .map((line) => {
      const [mac, dev, tap, master, bridge, status] = line.split(' ')
      return { mac, tap, bridge, status }
    })
    .filter(({ bridge, status }) => bridge === 'br0' && status !== 'permanent')
    .map(({ mac, tap }) => [tap, mac])
}

const updateHosts = async () => {
  const tapToUser = loadTapMap()
  const bridgeNodes = await getBridgeNodes()
  await db.touchHosts(bridgeNodes.map(([tap, mac]) => [tapToUser[tap], mac]))
}

module.exports = { updateHosts }
