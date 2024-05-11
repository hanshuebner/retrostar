const quill = new Quill('#editor', {
  modules: {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['link', 'image', 'code-block'],
    ],
    imageDropAndPaste: {
      // add an custom image handler
      handler: (a) => console.log('image pasted: ', a),
    },
  },
  theme: 'snow',
})

const uploadImage = () => {
  let fileInput = document.createElement('input')
  fileInput.setAttribute('type', 'file')
  fileInput.click()

  fileInput.onchange = () => {
    let file = fileInput.files[0]
    let formData = new FormData()
    formData.append('image', file)

    fetch('/api/image/e01900b0-cbd2-48fe-bab3-4ebbe95b59fb', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        let range = quill.getSelection()
        quill.insertEmbed(range.index, 'image', data.url)
      })
      .catch((error) => console.error(error))
  }
}

quill.getModule('toolbar').addHandler('image', uploadImage)

// When the form is submitted, populate the hidden field with the editor content
document.querySelector('#article-form').onsubmit = function () {
  document.querySelector('#content').value = quill.root.innerHTML
}
