const { spawn } = require('child_process')
const readline = require('readline')

// remember: sudo setcap cap_net_raw+eip $(which tcpdump)

const tcpdumpProcess = spawn('tcpdump', ['-l', '-i', 'br0', '-enn', '-s', '14'])

tcpdumpProcess.stdout.on('data', (data) =>
  data
    .toString()
    .trim()
    .split(/\r?\n/)
    .forEach((line) => {
      const [match, mac_address, protocol] = line.match(
        / (.*) > .*, ethertype .*? \(0x(....)\)/
      )
      if (match) {
        console.log(`${mac_address} -> ${protocol}`)
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
