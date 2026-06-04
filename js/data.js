// Data Management using Fetch API

const API_URL = 'http://localhost:3000/api';
const SESSION_KEY = 'unibite_current_user';

async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error(`fetchAPI error [${endpoint}]:`, error);
        throw error;
    }
}

// ==================== USERS ====================

async function getUsers() {
    return fetchAPI('/users');
}

async function getUserById(id) {
    return fetchAPI(`/users/id/${id}`);
}

async function getUserByUsername(username) {
    try {
        return await fetchAPI(`/users/${username}`);
    } catch (e) {
        return null;
    }
}

async function createUser(userData) {
    return fetchAPI('/users', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
}

async function updateUser(userId, updates) {
    return fetchAPI(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
}

async function addPoints(userId, points) {
    const user = await getUserById(userId);
    if (user) {
        return updateUser(userId, { points: user.points + points });
    }
}

async function deductPoints(userId, points) {
    const user = await getUserById(userId);
    if (user) {
        return updateUser(userId, { points: Math.max(0, user.points - points) });
    }
}

// ==================== LISTINGS ====================

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
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
}

async function deleteListing(listingId) {
    return fetchAPI(`/listings/${listingId}`, {
        method: 'DELETE'
    });
}

async function cleanupExpiredListings() {
    const listings = await getListings();
    const now = new Date();

    const active = listings.filter(l => {
        const created = new Date(l.createdAt);
        const hours = (now - created) / (1000 * 60 * 60);
        return hours < 48 && l.availablePortions > 0 && l.status !== 'deleted';
    });

    const inactive = listings.filter(l => {
        const created = new Date(l.createdAt);
        const hours = (now - created) / (1000 * 60 * 60);
        return hours < 48 && l.availablePortions <= 0 && l.status !== 'deleted';
    });

    return { active, inactive };
}

// ==================== REQUESTS ====================

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

async function createRequest(requestData) {
    return fetchAPI('/requests', {
        method: 'POST',
        body: JSON.stringify(requestData)
    });
}

async function updateRequest(requestId, updates) {
    return fetchAPI(`/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
}

// ==================== RATINGS ====================

async function getRatings() {
    return fetchAPI('/ratings');
}

async function getRatingsByCook(cookId) {
    const ratings = await getRatings();
    return ratings.filter(r => r.cookId === cookId);
}

async function createRating(ratingData) {
    return fetchAPI('/ratings', {
        method: 'POST',
        body: JSON.stringify(ratingData)
    });
}

async function getAverageRating(cookId) {
    const ratings = await getRatingsByCook(cookId);
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
}

// ==================== STATISTICS ====================

async function getMonthlyPortions() {
    const listings = await getListings();
    const now = new Date();
    const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
    return listings
        .filter(l => new Date(l.createdAt) >= oneMonthAgo)
        .reduce((acc, l) => acc + (l.portions - l.availablePortions), 0);
}

async function getTopDonor() {
    const users = await getUsers();
    if (!users || users.length === 0) return null;
    return users.sort((a, b) => b.offeredPortions - a.offeredPortions)[0];
}

async function getTopRatedMeal() {
    const listings = await getListings();
    const ratings = await getRatings();
    if (!ratings || ratings.length === 0) return null;

    const listingRatings = {};
    ratings.forEach(r => {
        if (!listingRatings[r.listingId]) listingRatings[r.listingId] = [];
        listingRatings[r.listingId].push(r.rating);
    });

    let topListing = null;
    let topAvg = 0;
    Object.keys(listingRatings).forEach(listingId => {
        const avg = listingRatings[listingId].reduce((a, b) => a + b, 0) / listingRatings[listingId].length;
        if (avg > topAvg) {
            topAvg = avg;
            topListing = listings.find(l => l.id === listingId);
        }
    });
    return topListing;
}

// ==================== SESSION ====================

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