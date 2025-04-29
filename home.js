document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');

    // Function to navigate to a specific page
    function navigateTo(page) {
        const pages = {
            login: 'role-select.html',
            signup: 'signup.html'
        };

        // Navigate to the specified page
        window.location.href = pages[page];
    }

    // Add click event listeners to buttons
    loginBtn.addEventListener('click', () => {
        navigateTo('login');
    });

    signupBtn.addEventListener('click', () => {
        navigateTo('signup');
    });
});