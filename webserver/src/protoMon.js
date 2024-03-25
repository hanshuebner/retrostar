const { spawn } = require('child_process')
const db = require('./db')

class ExpiringSet {
  constructor(entries = []) {
    this.set = new Map()
    entries?.forEach((entry) => this.add(entry))
  }

  add(value) {
    this.set.set(value, Date.now())
  }

  has(value) {
    if (!this.set.has(value)) {
      return false
    }

    if (Date.now() - this.set.get(value) > 600000) {
      this.set.delete(value)
      return false
    }

    return true
  }

  delete(value) {
    return this.set.delete(value)
  }

  getEntries() {
    const now = Date.now()
    for (const [key, value] of this.set) {
      if (now - value > 600000) {
        this.set.delete(key)
      }
    }
    return Array.from(this.set.keys())
  }
}

const loadHostProtocols = async () =>
  (await db.getAllHosts()).reduce(
    (hostProtocols, { mac_address, protocols }) => {
      hostProtocols[mac_address] = new ExpiringSet(protocols)
      return hostProtocols
    },
    {}
  )

const handlePacket = async (hosts, mac_address, protocolHex) => {
  if (!hosts[mac_address]) {
    console.log(`Unknown host ${mac_address}, reloading from DB`)
    hosts = await loadHostProtocols()
  }
  const protocol = parseInt(protocolHex, 16)
  if (hosts[mac_address]) {
    if (!hosts[mac_address].has(protocol)) {
      console.log(`Adding protocol ${protocolHex} to ${mac_address}`)
      hosts[mac_address].add(protocol)
      await db.updateHostProtocols(mac_address, hosts[mac_address].getEntries())
    }
  } else {
    console.log(`Unknown MAC address: ${mac_address}`)
  }
  return hosts
}

const protoMon = async () => {
  // remember: sudo setcap cap_net_raw+eip $(which tcpdump)
  const tcpdumpProcess = spawn('tcpdump', [
    '-l',
    '-i',
    'br0',
    '-enn',
    '-s',
    '28',
  ])

  let hosts = await loadHostProtocols()

  tcpdumpProcess.stdout.on('data', (data) =>
    data
      .toString()
      .trim()
      .split(/\r?\n/)
      .forEach((line) => {
        const match = line?.match(/ (.*) > .*, ethertype .*? \(0x(....)\)/)
        if (match) {
          const [_, mac_address, protocol] = match
          handlePacket(hosts, mac_address, protocol).then(
            (newHosts) => (hosts = newHosts)
          )
        }
      })
  )

  let tcpdump_errors = ''
  tcpdumpProcess.stderr.on('data', (data) => {
    tcpdump_errors += data.toString()
  })

  tcpdumpProcess.on('exit', (code) => {
    console.log(`tcpdump exited with code ${code}:\n${tcpdump_errors}`)
  })
}

protoMon()
