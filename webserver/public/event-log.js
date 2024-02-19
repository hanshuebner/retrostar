const formatEvent = event => {
  const timestamp = new Date(event.timestamp);
  const date = timestamp.toLocaleDateString('de-DE');
  const time = timestamp.toLocaleTimeString('de-DE', { hour12: false });

  return `${date} ${time}: ${event.message}`;
};

const addLog = (event) => {
  const eventLog = document.getElementById('event-log')
  eventLog.innerHTML += `<div class="event">${formatEvent(event)}</div>`
  eventLog.scrollTop = eventLog.scrollHeight
}

const initEventLog = () => {
  const socket = new WebSocket(
    document.location.origin.replace(/^http/, 'ws') + '/ws/event-log'
  )

  socket.onmessage = (event) => addLog(JSON.parse(event.data))
}

window.addEventListener('load', initEventLog)
