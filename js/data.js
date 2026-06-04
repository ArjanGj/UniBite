// Data Management using Fetch API

const API_URL = 'http://localhost:3000/api'; // Προσαρμόστε αυτό το URL ανάλογα με τον server σας
const SESSION_KEY = 'unibite_current_user';

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    // Προσθήκη Authorization token αν υπάρχει στο session
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.token) {
        defaultHeaders['Authorization'] = `Bearer ${currentUser.token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        // Αν η απάντηση είναι κενή, επιστρέφουμε null
        if (response.status === 204) return null;
        
        return await response.json();
    } catch (error) {
        console.error(`Error in fetchAPI for ${endpoint}:`, error);
        throw error;
    }
}

// User operations
async function getUsers() {
    return fetchAPI('/users');
}

async function getUserById(id) {
    return fetchAPI(`/users/${id}`);
}

async function getUserByUsername(username) {
    const users = await getUsers();
    return users.find(u => u.username === username);
}

async function createUser(userData) {
    return fetchAPI('/users', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
}

async function updateUser(userId, updates) {
    return fetchAPI(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

// Listing operations
async function getListings() {
    return fetchAPI('/listings');
}

async function getListingById(id) {
    return fetchAPI(`/listings/${id}`);
}

async function getListingsByCook(cookId) {
    const listings = await getListings();
    return listings.filter(l => l.cookId === cookId);
}

async function createListing(listingData) {
    return fetchAPI('/listings', {
        method: 'POST',
        body: JSON.stringify(listingData)
    });
}

async function updateListing(listingId, updates) {
    return fetchAPI(`/listings/${listingId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

async function deleteListing(listingId) {
    return fetchAPI(`/listings/${listingId}`, {
        method: 'DELETE'
    });
}

async function cleanupExpiredListings() {
    return fetchAPI('/listings/cleanup', { method: 'POST' });
}

// Request operations
async function getRequests() {
    return fetchAPI('/requests');
}

async function getRequestsByCook(cookId) {
    const requests = await getRequests();
    return requests.filter(r => r.cookId === cookId);
}

async function getRequestsByConsumer(consumerId) {
    const requests = await getRequests();
    return requests.filter(r => r.consumerId === consumerId);
}

async function getRequestsByListing(listingId) {
    const requests = await getRequests();
    return requests.filter(r => r.listingId === listingId);
}

async function createRequest(requestData) {
    return fetchAPI('/requests', {
        method: 'POST',
        body: JSON.stringify(requestData)
    });
}

async function updateRequest(requestId, updates) {
    return fetchAPI(`/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

// Rating operations
async function getRatings() {
    return fetchAPI('/ratings');
}

async function getRatingsByCook(cookId) {
    const ratings = await getRatings();
    return ratings.filter(r => r.cookId === cookId);
}

async function getRatingsByListing(listingId) {
    const ratings = await getRatings();
    return ratings.filter(r => r.listingId === listingId);
}

async function createRating(ratingData) {
    return fetchAPI('/ratings', {
        method: 'POST',
        body: JSON.stringify(ratingData)
    });
}

// Points system
async function addPoints(userId, points) {
    return fetchAPI(`/users/${userId}/points/add`, {
        method: 'POST',
        body: JSON.stringify({ points })
    });
}

async function deductPoints(userId, points) {
    return fetchAPI(`/users/${userId}/points/deduct`, {
        method: 'POST',
        body: JSON.stringify({ points })
    });
}

// Statistics
async function getAverageRating(cookId) {
    const ratings = await getRatingsByCook(cookId);
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
}

async function getMonthlyPortions() {
    return fetchAPI('/statistics/monthly-portions');
}

async function getTopDonor() {
    return fetchAPI('/statistics/top-donor');
}

async function getTopRatedMeal() {
    return fetchAPI('/statistics/top-rated-meal');
}

// Current user session (Keep in localStorage for client-side state)
function setCurrentUser(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function getCurrentUser() {
    const user = localStorage.getItem(SESSION_KEY);
    return user ? JSON.parse(user) : null;
}

function clearCurrentUser() {
    localStorage.removeItem(SESSION_KEY);
}
