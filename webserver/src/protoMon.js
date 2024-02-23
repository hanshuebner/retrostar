const { spawn } = require('child_process')
const db = require('./db')

const loadHostProtocols = async () =>
  (await db.getAllHosts()).reduce(
    (hostProtocols, { mac_address, protocols }) => {
      hostProtocols[mac_address] = new Set(protocols)
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
        await db.updateHostProtocols(mac_address, Array.from(hosts[mac_address]))
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
          handlePacket(hosts, mac_address, protocol).then((newHosts) => hosts = newHosts)
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
