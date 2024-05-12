const macAddress = window.location.pathname.split('/')[2]

const initCatalogEntryEditor = async () => {
  const editable =
    document.getElementById('editor').getAttribute('data-editable') === 'true'

  const commonQuillConfig = {
    theme: 'snow',
  }

  const quillConfig = editable
    ? {
        modules: {
          toolbar: [
            [{ header: [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            ['link', 'code-block'],
          ],
          imageDropAndPaste: {},
        },
      }
    : {
        readOnly: true,
        modules: {
          toolbar: null,
        },
      }
  const quill = new Quill('#editor', {
    ...quillConfig,
    ...commonQuillConfig,
  })

  const saveButton = document.getElementById('save')
  quill.on('text-change', () => {
    saveButton.removeAttribute('disabled')
  })
  saveButton.addEventListener('click', async () => {
    saveButton.setAttribute('disabled', true)
    const response = await fetch(`/api/host/${macAddress}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: quill.getSemanticHTML() }),
    })
  })
}

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

const initDirectEditingFields = async () => {
  document.querySelectorAll('td[contenteditable=true]').forEach((element) => {
    element.dataset.oldContent = element.textContent.trim()
    element.addEventListener('focus', () =>
      element.classList.remove('save-success', 'save-failure')
    )
    element.addEventListener('blur', () => sendData(element, macAddress))
    element.addEventListener('keydown', (event) =>
      handleKeyDown(event, element, macAddress)
    )
  })
  document
    .getElementById('blacklisted')
    .addEventListener('click', async (e) => {
      const blacklisted = e.target.checked
      await fetch(`/api/host/${macAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blacklisted }),
      })
    })
}

window.addEventListener('load', async () => {
  await initDirectEditingFields()
  await initCatalogEntryEditor()
})
