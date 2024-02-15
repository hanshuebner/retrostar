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

const handlePacket = async (hosts, mac_address, protocol) => {
  if (!hosts[mac_address]) {
    console.log(`Unknown host ${mac_address}, reloading from DB`)
    hosts = await loadHostProtocols()
  }
  if (hosts[mac_address]) {
    console.log(`Adding protocol ${protocol} to ${mac_address}`)
    hosts[mac_address].add(parseInt(protocol, 16))
    await db.updateHostProtocols(mac_address, Array.from(hosts[mac_address]))
  } else {
    console.log(`Unknown MAC address: ${mac_address}`)
  }
}

const protoMon = async () => {
  // remember: sudo setcap cap_net_raw+eip $(which tcpdump)
  const tcpdumpProcess = spawn('tcpdump', [
    '-l',
    '-i',
    'br0',
    '-enn',
    '-s',
    '14',
  ])

  const hosts = await loadHostProtocols()
  console.log('hosts:', hosts)

  tcpdumpProcess.stdout.on('data', (data) =>
    data
      .toString()
      .trim()
      .split(/\r?\n/)
      .forEach((line) => {
        const match = line?.match(/ (.*) > .*, ethertype .*? \(0x(....)\)/)
        if (match) {
          const [_, mac_address, protocol] = match
          console.log(`${mac_address} -> ${protocol}`)
          handlePacket(hosts, mac_address, protocol)
        } else {
          console.log(`Received line: ${line}`)
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

protoMon().then(console.log)
