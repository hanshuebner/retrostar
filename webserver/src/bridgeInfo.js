const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs')

const tapInterfaces = require('./tapInterfaces')
const db = require('./db')

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
  const tapToUser = tapInterfaces.loadTapMap()
  const bridgeNodes = await getBridgeNodes()
  await db.touchHosts(bridgeNodes.map(([tap, mac]) => [tapToUser[tap], mac]))
}

const startHostUpdater = () => {
  if (fs.existsSync(tapInterfaces.directory)) {
    setInterval(updateHosts, 1000)
  } else {
    console.log('No tap directory found, not starting host updater')
  }
}

module.exports = { startHostUpdater }
