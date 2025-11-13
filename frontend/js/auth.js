const API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const messageDiv = document.getElementById('message');

    // Mostrar/ocultar formularios
    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    // Login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirigir según el rol
                redirectByRole(data.user.role);
            } else {
                showMessage(data.error, 'error');
            }
        } catch (error) {
            showMessage('Error de conexión', 'error');
        }
    });

    // Registro
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('regRole').value;

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password, role })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Registro exitoso. Redirigiendo...', 'success');
                setTimeout(() => {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    redirectByRole(data.user.role);
                }, 2000);
            } else {
                showMessage(data.error, 'error');
            }
        } catch (error) {
            showMessage('Error de conexión', 'error');
        }
    });

    function redirectByRole(role) {
        switch(role) {
            case 'admin':
                window.location.href = 'admin.html';
                break;
            case 'artist':
                window.location.href = 'artist.html';
                break;
            case 'client':
            default:
                window.location.href = 'dashboard.html';
                break;
        }
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');
        
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }
});