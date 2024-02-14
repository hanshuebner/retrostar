const init = () => {
  document.querySelector('input')?.focus()

  const urlParams = new URLSearchParams(window.location.search)
  const pathParam = urlParams.get('path')
  const loginForm = document.getElementById('loginForm')

  if (pathParam) {
    // Append the path parameter to the action attribute of the form
    loginForm.action += '?path=' + pathParam

    // Remove the query string from the URL
    const newUrl = window.location.href.split('?')[0]
    window.history.replaceState({}, document.title, newUrl)
  }

  const queryString = window.location.search
  if (queryString.includes('error=1')) {
    const logfailElement = document.querySelector('.logfail')

    if (logfailElement) {
      logfailElement.style.display = 'block'
    }

    const newUrl = window.location.href.split('?')[0]
    window.history.replaceState({}, document.title, newUrl)
  }
}

// Call the function when the page loads
window.onload = init
