// Data Management using localStorage

const DB_KEYS = {
    USERS: 'unibite_users',
    LISTINGS: 'unibite_listings',
    REQUESTS: 'unibite_requests',
    RATINGS: 'unibite_ratings',
    CURRENT_USER: 'unibite_current_user'
};

// Initialize database with default data
function initializeDatabase() {
    if (!localStorage.getItem(DB_KEYS.USERS)) {
        const defaultUsers = [
            {
                id: 'admin1',
                username: 'admin',
                email: 'admin@unibite.com',
                password: 'admin123',
                role: 'admin',
                points: 0,
                offeredPortions: 0,
                receivedPortions: 0,
                createdAt: new Date().toISOString()
            },
            {
                id: 'cook1',
                username: 'chef',
                email: 'chef@unibite.com',
                password: 'chef123',
                role: 'cook',
                points: 5,
                offeredPortions: 0,
                receivedPortions: 0,
                createdAt: new Date().toISOString()
            },
            {
                id: 'consumer1',
                username: 'student',
                email: 'student@unibite.com',
                password: 'student123',
                role: 'consumer',
                points: 5,
                offeredPortions: 0,
                receivedPortions: 0,
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem(DB_KEYS.LISTINGS)) {
        localStorage.setItem(DB_KEYS.LISTINGS, JSON.stringify([]));
    }

    if (!localStorage.getItem(DB_KEYS.REQUESTS)) {
        localStorage.setItem(DB_KEYS.REQUESTS, JSON.stringify([]));
    }

    if (!localStorage.getItem(DB_KEYS.RATINGS)) {
        localStorage.setItem(DB_KEYS.RATINGS, JSON.stringify([]));
    }
}

// Generic CRUD operations
function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// User operations
function getUsers() {
    return getData(DB_KEYS.USERS);
}

function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id);
}

function getUserByUsername(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
}

function createUser(userData) {
    const users = getUsers();
    const newUser = {
        id: 'user_' + Date.now(),
        ...userData,
        points: 5, // New users start with 5 points
        offeredPortions: 0,
        receivedPortions: 0,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    setData(DB_KEYS.USERS, users);
    return newUser;
}

function updateUser(userId, updates) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        setData(DB_KEYS.USERS, users);
        return users[index];
    }
    return null;
}

// Listing operations
function getListings() {
    return getData(DB_KEYS.LISTINGS);
}

function getListingById(id) {
    const listings = getListings();
    return listings.find(l => l.id === id);
}

function getListingsByCook(cookId) {
    const listings = getListings();
    return listings.filter(l => l.cookId === cookId);
}

function createListing(listingData) {
    const listings = getListings();
    const newListing = {
        id: 'listing_' + Date.now(),
        ...listingData,
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    listings.push(newListing);
    setData(DB_KEYS.LISTINGS, listings);
    return newListing;
}

function updateListing(listingId, updates) {
    const listings = getListings();
    const index = listings.findIndex(l => l.id === listingId);
    if (index !== -1) {
        listings[index] = { ...listings[index], ...updates };
        setData(DB_KEYS.LISTINGS, listings);
        return listings[index];
    }
    return null;
}

function deleteListing(listingId) {
    const listings = getListings();
    const filtered = listings.filter(l => l.id !== listingId);
    setData(DB_KEYS.LISTINGS, filtered);
}

// Clean up expired listings (older than 48 hours)
function cleanupExpiredListings() {
    const listings = getListings();
    const now = new Date();
    const activeListings = listings.filter(l => {
        const createdAt = new Date(l.createdAt);
        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
        return hoursSinceCreation < 48 && l.availablePortions > 0;
    });
    
    const inactiveListings = listings.filter(l => {
        const createdAt = new Date(l.createdAt);
        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
        return hoursSinceCreation >= 48 || l.availablePortions <= 0;
    });

    // Update status
    inactiveListings.forEach(l => {
        updateListing(l.id, { status: 'inactive' });
    });

    return { active: activeListings, inactive: inactiveListings };
}

// Request operations
function getRequests() {
    return getData(DB_KEYS.REQUESTS);
}

function getRequestsByCook(cookId) {
    const requests = getRequests();
    return requests.filter(r => r.cookId === cookId);
}

function getRequestsByConsumer(consumerId) {
    const requests = getRequests();
    return requests.filter(r => r.consumerId === consumerId);
}

function getRequestsByListing(listingId) {
    const requests = getRequests();
    return requests.filter(r => r.listingId === listingId);
}

function createRequest(requestData) {
    const requests = getRequests();
    const newRequest = {
        id: 'request_' + Date.now(),
        ...requestData,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    requests.push(newRequest);
    setData(DB_KEYS.REQUESTS, requests);
    return newRequest;
}

function updateRequest(requestId, updates) {
    const requests = getRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index !== -1) {
        requests[index] = { ...requests[index], ...updates };
        setData(DB_KEYS.REQUESTS, requests);
        return requests[index];
    }
    return null;
}

// Rating operations
function getRatings() {
    return getData(DB_KEYS.RATINGS);
}

function getRatingsByCook(cookId) {
    const ratings = getRatings();
    return ratings.filter(r => r.cookId === cookId);
}

function getRatingsByListing(listingId) {
    const ratings = getRatings();
    return ratings.filter(r => r.listingId === listingId);
}

function createRating(ratingData) {
    const ratings = getRatings();
    const newRating = {
        id: 'rating_' + Date.now(),
        ...ratingData,
        createdAt: new Date().toISOString()
    };
    ratings.push(newRating);
    setData(DB_KEYS.RATINGS, ratings);
    return newRating;
}

// Points system
function addPoints(userId, points) {
    const user = getUserById(userId);
    if (user) {
        updateUser(userId, { points: user.points + points });
    }
}

function deductPoints(userId, points) {
    const user = getUserById(userId);
    if (user) {
        updateUser(userId, { points: Math.max(0, user.points - points) });
    }
}

// Calculate average rating for a cook
function getAverageRating(cookId) {
    const ratings = getRatingsByCook(cookId);
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
}

// Admin statistics
function getMonthlyPortions() {
    const listings = getListings();
    const now = new Date();
    const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
    
    const monthlyListings = listings.filter(l => {
        const createdAt = new Date(l.createdAt);
        return createdAt >= oneMonthAgo;
    });

    const totalPortions = monthlyListings.reduce((acc, l) => {
        return acc + (l.portions - l.availablePortions);
    }, 0);

    return totalPortions;
}

function getTopDonor() {
    const users = getUsers();
    const cooks = users.filter(u => u.role === 'cook');
    if (cooks.length === 0) return null;

    const sorted = cooks.sort((a, b) => b.offeredPortions - a.offeredPortions);
    return sorted[0];
}

function getTopRatedMeal() {
    const listings = getListings();
    const ratings = getRatings();
    
    if (ratings.length === 0) return null;

    const listingRatings = {};
    ratings.forEach(r => {
        if (!listingRatings[r.listingId]) {
            listingRatings[r.listingId] = [];
        }
        listingRatings[r.listingId].push(r.rating);
    });

    let topListing = null;
    let topAvg = 0;

    Object.keys(listingRatings).forEach(listingId => {
        const avg = listingRatings[listingId].reduce((a, b) => a + b, 0) / listingRatings[listingId].length;
        if (avg > topAvg) {
            topAvg = avg;
            topListing = getListingById(listingId);
        }
    });

    return topListing;
}

// Current user session
function setCurrentUser(user) {
    localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
}

function getCurrentUser() {
    const user = localStorage.getItem(DB_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
}

function clearCurrentUser() {
    localStorage.removeItem(DB_KEYS.CURRENT_USER);
}

// Initialize on load
initializeDatabase();
