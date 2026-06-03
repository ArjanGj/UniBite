// Authentication functions

function showAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(f => f.classList.add('hidden'));

    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('registerForm').classList.remove('hidden');
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const user = getUserByUsername(username);
    
    if (user && user.password === password) {
        setCurrentUser(user);
        showMainApp();
    } else {
        alert('Λάθος όνομα χρήστη ή κωδικός');
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    // Check if username already exists
    const existingUser = getUserByUsername(username);
    if (existingUser) {
        alert('Το όνομα χρήστη υπάρχει ήδη');
        return;
    }

    const newUser = createUser({
        username,
        email,
        password,
        role
    });

    setCurrentUser(newUser);
    showMainApp();
}

function logout() {
    clearCurrentUser();
    location.reload();
}

function checkAuth() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        showMainApp();
    } else {
        showAuthView();
    }
}

function showAuthView() {
    document.getElementById('authView').classList.remove('hidden');
    document.querySelector('.navbar').style.display = 'none';
}

function showMainApp() {
    const currentUser = getCurrentUser();
    
    document.getElementById('authView').classList.add('hidden');
    document.querySelector('.navbar').style.display = 'flex';
    
    // Show/hide admin button based on role
    const adminBtn = document.querySelector('.admin-only');
    if (currentUser.role === 'admin') {
        adminBtn.style.display = 'block';
    } else {
        adminBtn.style.display = 'none';
    }

    // Show feed by default
    showView('feed');
}
