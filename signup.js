document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const loginLink = document.getElementById('loginLink');

    // Password toggle functionality
    const passwordToggle = document.getElementById('passwordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle the eye icon
            const eyeIcon = passwordToggle.querySelector('i');
            eyeIcon.classList.toggle('fa-eye');
            eyeIcon.classList.toggle('fa-eye-slash');
        });
    }

    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', () => {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            
            // Toggle the eye icon
            const eyeIcon = confirmPasswordToggle.querySelector('i');
            eyeIcon.classList.toggle('fa-eye');
            eyeIcon.classList.toggle('fa-eye-slash');
        });
    }

    // Login link redirect to role selection
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'role-select.html';
    });

    // Basic form validation
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Password validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert('Passwords do not match. Please try again.');
            return;
        }

        // Password strength check
        if (passwordInput.value.length < 8) {
            alert('Password must be at least 8 characters long.');
            return;
        }

        // Basic email validation
        const emailInput = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value)) {
            alert('Please enter a valid email address.');
            return;
        }

        // Prepare form data
        const formData = new FormData();
        formData.append('email', emailInput.value);
        formData.append('password', passwordInput.value);
        formData.append('confirmPassword', confirmPasswordInput.value);
        formData.append('role', 'admin'); // Always set role to admin

        try {
            // Send data to server
            const response = await fetch('http://localhost:3000/signup', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                alert('Admin account created successfully!');
                signupForm.reset();
                // Redirect to login page
                window.location.href = 'role-select.html';
            } else {
                alert(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during registration');
        }
    });

    // Optional: Real-time password match indicator
    confirmPasswordInput.addEventListener('input', () => {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.style.borderColor = 'red';
        } else {
            confirmPasswordInput.style.borderColor = '#ddd';
        }
    });
});