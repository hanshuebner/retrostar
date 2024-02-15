function sendData(element, macAddress) {
  const newValue = element.textContent
  const url = 'http://your-server-url.com/update'
  const data = { mac_address: macAddress, name: newValue }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Success:', data)
    })
    .catch((error) => {
      console.error('Error:', error)
    })
}
