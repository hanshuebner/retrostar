const sendData = async (element, macAddress) => {
  const response = await fetch(`/api/host/${macAddress}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: element.textContent }),
  })
}

const handleKeyDown = async (event, element, macAddress) => {
  if (event.key === 'Enter' || event.keyCode === 13) {
    event.preventDefault()
    sendData(element, macAddress)
  }
}
