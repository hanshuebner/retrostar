const connect = (host) => {
  console.log('connect to ' + host)

  document.querySelector('.choose-host').style.display = 'none'

  const socket = new WebSocket(
    document.location.origin.replace(/^http/, 'ws') + `/ws/lat/${host}`
  )

  socket.onmessage = (event) => term.write(event.data)
  socket.onopen = () => console.log('Connected to ' + host)
  socket.onclose = () => {
    console.log('Disconnected')
    document.location = document.location
  }

  const term = new window.Terminal({
    cursorBlink: true,
    cols: 80,
    rows: 24,
  })

  term.parser.registerCsiHandler({ final: 'c' }, (params) => {
    socket.send('\x1b[?1c') // terminal is VT100
    return true
  })
  term.open(document.getElementById('terminal'))
  term.onKey((keyObj) => socket.send(keyObj.key))
}
