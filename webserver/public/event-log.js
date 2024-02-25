const formatEvent = (event) => {
  const timestamp = new Date(event.timestamp)
  const date = timestamp.toLocaleDateString('de-DE')
  const time = timestamp.toLocaleTimeString('de-DE', { hour12: false })

  return `${date} ${time}: ${event.message}`
}

const addLog = (event) => {
  const eventLog = document.getElementById('event-log')
  eventLog.innerHTML += `<div class="event">${formatEvent(event)}</div>`
  eventLog.scrollTop = eventLog.scrollHeight
}

const initEventLog = () => {
  console.log('establishing websocket connection')

  let socket

  socket = new WebSocket(
    document.location.origin.replace(/^http/, 'ws') + '/ws/event-log'
  )

  setInterval(() => {
    if (socket?.readyState === 1) {
      socket.send('ping')
    } else {
      console.log('event log connection closed, reloading in 2 seconds')
      setTimeout(() => document.location.reload(), 2000)
    }
  }, 2000)

  socket.onmessage = (event) => addLog(JSON.parse(event.data))

  const setEventLogVisibility = (visible) => {
    const eventLogIcon = document.getElementById('event-log-icon')
    eventLogIcon.style.display = visible ? 'none' : 'block'
    const eventLog = document.getElementById('event-log')
    eventLog.style.display = visible ? 'block' : 'none'
    if (visible) {
      localStorage.setItem('eventLogVisible', 'true')
      eventLog.scrollTop = eventLog.scrollHeight
    } else {
      localStorage.removeItem('eventLogVisible')
    }
  }

  document
    .getElementById('event-log')
    .addEventListener('click', () => setEventLogVisibility(false))

  document
    .getElementById('event-log-icon')
    .addEventListener('click', () => setEventLogVisibility(true))

  setEventLogVisibility(localStorage.getItem('eventLogVisible') === 'true')
}

window.addEventListener('load', initEventLog)
