document.addEventListener('DOMContentLoaded', () => {
    const roleCards = document.querySelectorAll('.role-card');
    const continueBtn = document.getElementById('continueBtn');
    let selectedRole = null;

    // Role selection logic
    roleCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active state from all cards
            roleCards.forEach(c => c.classList.remove('active'));
            
            // Add active state to clicked card
            card.classList.add('active');
            
            // Store selected role
            selectedRole = card.getAttribute('data-role');
            
            // Enable continue button
            continueBtn.disabled = false;
        });
    });

    // Continue button logic
    continueBtn.addEventListener('click', () => {
        if (selectedRole) {
            // Store the selected role in localStorage
            localStorage.setItem('selectedRole', selectedRole);
            
            // Redirect to login page
            window.location.href = 'login.html';
        }
    });
});