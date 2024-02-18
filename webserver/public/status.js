const sendData = async (element, macAddress) => {
  const newContent = element.textContent.trim()
  if (newContent === element.dataset.oldContent) {
    return
  }
  element.dataset.oldContent = newContent
  const changeRequest = {}
  changeRequest[element.dataset.field] = newContent
  const response = await fetch(`/api/host/${macAddress}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changeRequest),
  })
  element.blur()
  element.classList.add(response.ok ? 'save-success' : 'save-failure')
}

const handleKeyDown = async (event, element, macAddress) => {
  if (event.key === 'Enter' || event.keyCode === 13) {
    event.preventDefault()
    sendData(element, macAddress)
  }
}

const init = () => {
  document.querySelectorAll('td[contenteditable=true]').forEach((element) => {
    const macAddress = element.parentElement.dataset.macAddress
    element.dataset.oldContent = element.textContent.trim()
    element.addEventListener('focus', () =>
      element.classList.remove('save-success', 'save-failure')
    )
    element.addEventListener('blur', () => sendData(element, macAddress))
    element.addEventListener('keydown', (event) =>
      handleKeyDown(event, element, macAddress)
    )
  })
}

window.onload = init
