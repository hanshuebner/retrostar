const init = () => {
  document.getElementById('username').focus()

  const urlParams = new URLSearchParams(window.location.search)
  const pathParam = urlParams.get('path')

  if (pathParam) {
    document.getElementById('loginForm').action += '?path=' + pathParam
  }

  if (urlParams.get('error')) {
    document.querySelector('.logfail').style.display = 'block'
  }
  if (urlParams.get('reset-success')) {
    document.querySelector('.reset-success').style.display = 'block'
  }

  const newUrl = window.location.href.split('?')[0]
  window.history.replaceState({}, document.title, newUrl)
}

window.addEventListener('load', init)
