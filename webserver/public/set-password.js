const validatePassword = (password) => {
  // Check for minimum length
  const minLength = 8
  if (password.length < minLength) {
    return false
  }

  // Check for complexity (at least one lowercase, one uppercase, one digit, and one special character)
  const complexityRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/
  if (!complexityRegex.test(password)) {
    return false
  }

  // Check for common patterns or sequences
  const commonPatterns = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    '111111',
    '123123',
    'asdfgh',
    'zxcvbn',
    '987654321',
  ]
  if (
    commonPatterns.some((pattern) => password.toLowerCase().includes(pattern))
  ) {
    return false
  }

  // Check against username (assuming username input exists with id 'username')
  const username = document.getElementById('username')?.value
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    return false
  }

  return true
}

const init = () => {
  const oldPasswordInput = document.getElementById('oldPassword')
  const newPasswordInput = document.getElementById('password')
  const confirmPasswordInput = document.getElementById('confirmPassword')
  const submitBtn = document.getElementById('submitBtn')

  const passwordsMatch = () => {
    return (
      newPasswordInput.value === confirmPasswordInput.value &&
      (!oldPasswordInput || oldPasswordInput.value !== newPasswordInput.value)
    )
  }

  const updateSubmitBtn = () => {
    submitBtn.disabled = !(
      validatePassword(newPasswordInput.value) && passwordsMatch()
    )
    return null
  }

  oldPasswordInput?.addEventListener('input', updateSubmitBtn)
  newPasswordInput.addEventListener('input', updateSubmitBtn)
  confirmPasswordInput.addEventListener('input', updateSubmitBtn)

  const firstInput = oldPasswordInput || newPasswordInput
  firstInput.focus()
}

window.addEventListener('load', init)
