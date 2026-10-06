document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const statusDiv = document.getElementById('formStatus');

  const identifier = document.getElementById('identifier');
  const password = document.getElementById('password');
  const identifierError = document.getElementById('identifier_error');
  const passwordError = document.getElementById('password_error');

  function setFieldError(input, errorEl, message) {
    if (message) {
      input.classList.add('error');
      errorEl.textContent = message;
    } else {
      input.classList.remove('error');
      errorEl.textContent = '';
    }
  }

  function validateField() {
    let isValid = true;
    const ident = identifier.value.trim();
    if (ident.length === 0) {
      setFieldError(identifier, identifierError, 'Email or Student ID is required.');
      isValid = false;
    } else {
      if (ident.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ident)) {
          setFieldError(identifier, identifierError, 'Please enter a valid email address.');
          isValid = false;
        } else {
          setFieldError(identifier, identifierError, '');
        }
      } else {
        setFieldError(identifier, identifierError, '');
      }
    }

    const pass = password.value;
    if (pass.length < 1) {
      setFieldError(password, passwordError, 'Password is required.');
      isValid = false;
    } else {
      setFieldError(password, passwordError, '');
    }
    return isValid;
  }

  identifier.addEventListener('blur', validateField);
  password.addEventListener('blur', validateField);
  identifier.addEventListener('input', () => {
    if (identifier.classList.contains('error')) {
      identifier.classList.remove('error');
      identifierError.textContent = '';
    }
  });
  password.addEventListener('input', () => {
    if (password.classList.contains('error')) {
      password.classList.remove('error');
      passwordError.textContent = '';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateField()) {
      statusDiv.textContent = 'Please fix the errors above.';
      statusDiv.className = 'form-status error';
      return;
    }

    const ident = identifier.value.trim();
    let payload = { password: password.value };
    if (ident.includes('@')) {
      payload.email = ident;
    } else {
      payload.student_id = ident;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    statusDiv.textContent = '';
    statusDiv.className = 'form-status';

    try {
      const response = await fetch(`${StudyHub.API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        statusDiv.textContent = 'Login successful! Redirecting...';
        statusDiv.className = 'form-status success';

        // ✅ Role-based redirection
        const redirectUrl = StudyHub.DASHBOARD_URLS[result.user.role] || StudyHub.DASHBOARD_URLS.student;

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        let errorMsg = result.message || 'Login failed. Please try again.';
        if (result.errors && Array.isArray(result.errors)) {
          setFieldError(identifier, identifierError, '');
          setFieldError(password, passwordError, '');
          result.errors.forEach(err => {
            const param = err.param;
            const msg = err.msg;
            if (param === 'email' || param === 'student_id') {
              setFieldError(identifier, identifierError, msg);
            } else if (param === 'password') {
              setFieldError(password, passwordError, msg);
            } else {
              errorMsg = msg;
            }
          });
          if (identifier.classList.contains('error') || password.classList.contains('error')) {
            statusDiv.textContent = 'Please correct the highlighted fields.';
          } else {
            statusDiv.textContent = errorMsg;
          }
          statusDiv.className = 'form-status error';
        } else {
          statusDiv.textContent = errorMsg;
          statusDiv.className = 'form-status error';
        }
      }
    } catch (error) {
      statusDiv.textContent = 'Network error. Please check your connection.';
      statusDiv.className = 'form-status error';
      console.error('Fetch error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
});