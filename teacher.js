document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    const selectedRole = localStorage.getItem('selectedRole');

    if (!authToken || !userData || selectedRole !== 'teacher') {
        // Redirect to login if not authenticated or not a teacher
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('selectedRole');
        window.location.href = 'login.html';
        return;
    }

    // Teacher dashboard specific code...
});