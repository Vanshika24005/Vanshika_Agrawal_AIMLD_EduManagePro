document.addEventListener('DOMContentLoaded', () => {
    // Retrieve selected role from localStorage
    const selectedRole = localStorage.getItem('selectedRole');
    
    // Set page content based on selected role
    const roleTitle = document.getElementById('roleTitle');
    const roleSubtitle = document.getElementById('roleSubtitle');
    const roleIcon = document.querySelector('.role-icon');

    // Role-specific configurations
    const roleConfigs = {
        admin: {
            title: 'Administrator Login',
            subtitle: 'Manage school operations',
            iconClass: 'admin-icon'
        },
        teacher: {
            title: 'Teacher Login',
            subtitle: 'Access teaching dashboard',
            iconClass: 'teacher-icon'
        },
        student: {
            title: 'Student Login',
            subtitle: 'Access your academic portal',
            iconClass: 'student-icon'
        },
        parent: {
            title: 'Parent Login',
            subtitle: 'Monitor your child\'s progress',
            iconClass: 'parent-icon'
        }
    };

    // Apply role-specific configurations
    if (selectedRole && roleConfigs[selectedRole]) {
        const config = roleConfigs[selectedRole];
        roleTitle.textContent = config.title;
        roleSubtitle.textContent = config.subtitle;
        roleIcon.classList.add(config.iconClass);
    }

    // Password toggle functionality
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');

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

    // login.js - Update the login form submission handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get login credentials
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const selectedRole = localStorage.getItem('selectedRole');

    try {
        // Send login request to server
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value,
                role: selectedRole
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // Store authentication token and user data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Redirect to role-specific dashboard
            switch(selectedRole) {
                case 'admin':
                    window.location.href = 'admin.html';
                    break;
                case 'teacher':
                    window.location.href = 'teacher.html';
                    break;
                case 'student':
                    window.location.href = 'student.html';
                    break;
                case 'parent':
                    window.location.href = 'parent.html';
                    break;
                default:
                    window.location.href = 'login.html';
            }
        } else {
            alert(data.message || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during login');
    }
});
});