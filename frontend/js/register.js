document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const submitBtn = document.getElementById('submitBtn');
  const statusDiv = document.getElementById('formStatus');

  // Input fields
  const fullName = document.getElementById('full_name');
  const email = document.getElementById('email');
  const studentId = document.getElementById('student_id');
  const password = document.getElementById('password');
  const confirm = document.getElementById('password_confirmation');

  // Error spans
  const fullNameError = document.getElementById('full_name_error');
  const emailError = document.getElementById('email_error');
  const studentIdError = document.getElementById('student_id_error');
  const passwordError = document.getElementById('password_error');
  const confirmError = document.getElementById('confirm_error');

  // Helper: set field error
  function setFieldError(input, errorEl, message) {
    if (message) {
      input.classList.add('error');
      errorEl.textContent = message;
    } else {
      input.classList.remove('error');
      errorEl.textContent = '';
    }
  }

  // Client‑side validation (mirrors backend constraints)
  function validateField() {
    let isValid = true;

    // Full name
    const nameVal = fullName.value.trim();
    if (nameVal.length < 2) {
      setFieldError(fullName, fullNameError, 'Full name must be at least 2 characters.');
      isValid = false;
    } else {
      setFieldError(fullName, fullNameError, '');
    }

    // Email
    const emailVal = email.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setFieldError(email, emailError, 'Please enter a valid email address.');
      isValid = false;
    } else {
      setFieldError(email, emailError, '');
    }

    // Student ID
    const sidVal = studentId.value.trim();
    if (sidVal.length < 5 || sidVal.length > 50) {
      setFieldError(studentId, studentIdError, 'Student ID must be between 5 and 50 characters.');
      isValid = false;
    } else {
      setFieldError(studentId, studentIdError, '');
    }

    // Password
    const passVal = password.value;
    if (passVal.length < 6) {
      setFieldError(password, passwordError, 'Password must be at least 6 characters.');
      isValid = false;
    } else {
      setFieldError(password, passwordError, '');
    }

    // Confirm password
    const confirmVal = confirm.value;
    if (confirmVal !== passVal) {
      setFieldError(confirm, confirmError, 'Passwords do not match.');
      isValid = false;
    } else {
      setFieldError(confirm, confirmError, '');
    }

    return isValid;
  }

  // Attach real‑time validation on blur
  [fullName, email, studentId, password, confirm].forEach(input => {
    input.addEventListener('blur', validateField);
    input.addEventListener('input', () => {
      // Clear field error while typing (optional)
      if (input.classList.contains('error')) {
        const errorEl = document.getElementById(input.id + '_error');
        if (errorEl) {
          input.classList.remove('error');
          errorEl.textContent = '';
        }
      }
    });
  });

  // --- Form Submission ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Run client‑side validation
    if (!validateField()) {
      statusDiv.textContent = 'Please fix the errors above.';
      statusDiv.className = 'form-status error';
      return;
    }

    // Prepare data
    const payload = {
      full_name: fullName.value.trim(),
      email: email.value.trim(),
      student_id: studentId.value.trim(),
      password: password.value
    };

    // Disable button & show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    statusDiv.textContent = '';
    statusDiv.className = 'form-status';

    try {
      // Adjust URL to your backend – if frontend is served from same origin, use relative path.
      // Otherwise, use full URL: http://localhost:5000/api/auth/register
      const response = await fetch(`${StudyHub.API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        // Success (201)
        statusDiv.textContent = result.message || 'Registration successful! Redirecting...';
        statusDiv.className = 'form-status success';
        // Redirect to login after short delay
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        // Handle errors
        let errorMsg = result.message || 'Registration failed. Please try again.';

        // If validation errors (array from express-validator)
        if (result.errors && Array.isArray(result.errors)) {
          // Clear all field errors first
          setFieldError(fullName, fullNameError, '');
          setFieldError(email, emailError, '');
          setFieldError(studentId, studentIdError, '');
          setFieldError(password, passwordError, '');
          setFieldError(confirm, confirmError, '');

          // Map each error to the corresponding field
          result.errors.forEach(err => {
            const param = err.param;
            const msg = err.msg;
            switch (param) {
              case 'full_name':
                setFieldError(fullName, fullNameError, msg);
                break;
              case 'email':
                setFieldError(email, emailError, msg);
                break;
              case 'student_id':
                setFieldError(studentId, studentIdError, msg);
                break;
              case 'password':
                setFieldError(password, passwordError, msg);
                break;
              default:
                // If param unknown, we still show it globally
                errorMsg = msg;
            }
          });
          // If there were field errors, we might not want to show a global message as well,
          // but we can keep a generic note.
          statusDiv.textContent = 'Please correct the highlighted fields.';
          statusDiv.className = 'form-status error';
        } else {
          // Simple message error (e.g., "Email already exists")
          statusDiv.textContent = errorMsg;
          statusDiv.className = 'form-status error';
        }
      }
    } catch (error) {
      // Network or other fetch errors
      statusDiv.textContent = 'Network error. Please check your connection.';
      statusDiv.className = 'form-status error';
      console.error('Fetch error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
});