// UI Functions

function showView(viewName) {
    // Hide all views
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.add('hidden'));

    // Show selected view
    const selectedView = document.getElementById(viewName + 'View');
    if (selectedView) {
        selectedView.classList.remove('hidden');
    }

    // Render content based on view
    switch(viewName) {
        case 'feed':
            renderFeed();
            break;
        case 'map':
            renderMap();
            break;
        case 'my-listings':
            renderMyListings();
            break;
        case 'requests':
            renderRequests();
            break;
        case 'profile':
            renderProfile();
            break;
        case 'admin':
            renderAdmin();
            break;
    }
}

function showCreateListingModal() {
    document.getElementById('createListingModal').classList.remove('hidden');
    // Initialize location picker map after modal is visible
    setTimeout(() => {
        initLocationPicker();
    }, 100);
}

function showRatingModal(requestId) {
    document.getElementById('ratingRequestId').value = requestId;
    document.getElementById('ratingModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function setRating(value) {
    document.getElementById('ratingValue').value = value;
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Feed rendering
function renderFeed() {
    const currentUser = getCurrentUser();
    const { active, inactive } = cleanupExpiredListings();
    const allListings = [...active, ...inactive];
    
    const sortFilter = document.getElementById('sortFilter').value;
    
    // Sort listings
    let sortedListings = [...allListings];
    if (sortFilter === 'newest') {
        sortedListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortFilter === 'distance') {
        // For demo, just sort by creation date
        sortedListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortFilter === 'rating') {
        sortedListings.sort((a, b) => {
            const ratingA = getAverageRating(a.cookId);
            const ratingB = getAverageRating(b.cookId);
            return ratingB - ratingA;
        });
    }

    const feedList = document.getElementById('feedList');
    feedList.innerHTML = '';

    sortedListings.forEach(listing => {
        const cook = getUserById(listing.cookId);
        const avgRating = getAverageRating(listing.cookId);
        const isInactive = listing.status === 'inactive' || listing.availablePortions === 0;
        
        // Build location string
        let locationStr = listing.location;
        if (listing.address && listing.area) {
            locationStr = `${listing.address}, ${listing.area}`;
            if (listing.postalCode) {
                locationStr += `, ${listing.postalCode}`;
            }
            if (listing.location) {
                locationStr += ` (${listing.location})`;
            }
        }
        
        const card = document.createElement('div');
        card.className = `listing-card ${isInactive ? 'inactive' : ''}`;
        
        card.innerHTML = `
            <div class="listing-image">🍽️</div>
            <div class="listing-content">
                <h3 class="listing-title">${listing.title}</h3>
                <p class="listing-description">${listing.description}</p>
                <div class="listing-meta">
                    <span>👨‍🍳 ${cook.username}</span>
                    <span class="listing-rating">★ ${avgRating}</span>
                </div>
                <div class="listing-meta">
                    <span class="listing-portions">${listing.availablePortions}/${listing.portions} μερίδες</span>
                    <span>📍 ${locationStr}</span>
                </div>
                <div class="listing-meta">
                    <span>🕐 ${new Date(listing.pickupTime).toLocaleString('el-GR')}</span>
                </div>
                ${listing.allergens ? `<div class="listing-meta"><span>⚠️ Αλλεργιογόνα: ${listing.allergens}</span></div>` : ''}
                <div class="listing-actions">
                    <button class="btn-primary" 
                            onclick="requestPortion('${listing.id}')" 
                            ${isInactive || currentUser.points < 1 ? 'disabled' : ''}>
                        ${isInactive ? 'Μη διαθέσιμο' : 'Ζήτηση μερίδας'}
                    </button>
                </div>
            </div>
        `;
        
        feedList.appendChild(card);
    });
}

// Map rendering with Google Maps
let map = null;
let markers = [];

function renderMap() {
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = '<p>Το Google Maps API δεν φορτώθηκε. Ελέγξτε το API key.</p>';
        return;
    }

    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = '';
    
    // Clear existing markers
    markers = [];
    
    // Initialize map centered on Patras
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 38.2466, lng: 21.7344 },
        zoom: 13,
        mapTypeId: 'roadmap'
    });
    
    // Get active listings
    const { active } = cleanupExpiredListings();
    
    // Add markers for each listing
    active.forEach(listing => {
        const cook = getUserById(listing.cookId);
        const avgRating = getAverageRating(listing.cookId);
        
        // Use stored coordinates if available, otherwise use random for backward compatibility
        const lat = listing.lat || (38.2466 + (Math.random() - 0.5) * 0.05);
        const lng = listing.lng || (21.7344 + (Math.random() - 0.5) * 0.05);
        
        // Build location string
        let locationStr = listing.location;
        if (listing.address && listing.area) {
            locationStr = `${listing.address}, ${listing.area}`;
            if (listing.postalCode) {
                locationStr += `, ${listing.postalCode}`;
            }
            if (listing.location) {
                locationStr += ` (${listing.location})`;
            }
        }
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="map-popup">
                    <h3>${listing.title}</h3>
                    <p><strong>Μάγειρας:</strong> ${cook.username}</p>
                    <p><strong>Μερίδες:</strong> ${listing.availablePortions}/${listing.portions}</p>
                    <p><strong>Τοποθεσία:</strong> ${locationStr}</p>
                    <p><strong>Ώρα:</strong> ${new Date(listing.pickupTime).toLocaleString('el-GR')}</p>
                    <p><strong>Βαθμολογία:</strong> ★ ${avgRating}</p>
                    ${listing.allergens ? `<p><strong>⚠️ Αλλεργιογόνα:</strong> ${listing.allergens}</p>` : ''}
                    <button onclick="requestPortion('${listing.id}')" class="btn-primary" style="margin-top: 10px; width: 100%;">Ζήτηση μερίδας</button>
                </div>
            `
        });
        
        const marker = new google.maps.Marker({
            position: { lat, lng },
            map: map,
            title: listing.title
        });
        
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
        
        markers.push(marker);
    });
    
    // Fit map to show all markers
    if (markers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });
        map.fitBounds(bounds);
    }
}

// My Listings rendering
function renderMyListings() {
    const currentUser = getCurrentUser();
    const myListings = getListingsByCook(currentUser.id);
    
    const listingsGrid = document.getElementById('myListings');
    listingsGrid.innerHTML = '';

    if (myListings.length === 0) {
        listingsGrid.innerHTML = '<p>Δεν έχετε δημιουργήσει αγγελίες ακόμα</p>';
        return;
    }

    myListings.forEach(listing => {
        const avgRating = getAverageRating(currentUser.id);
        const isInactive = listing.status === 'inactive' || listing.availablePortions === 0;
        
        // Build location string
        let locationStr = listing.location;
        if (listing.address && listing.area) {
            locationStr = `${listing.address}, ${listing.area}`;
            if (listing.postalCode) {
                locationStr += `, ${listing.postalCode}`;
            }
            if (listing.location) {
                locationStr += ` (${listing.location})`;
            }
        }
        
        const card = document.createElement('div');
        card.className = `listing-card ${isInactive ? 'inactive' : ''}`;
        
        card.innerHTML = `
            <div class="listing-image">🍽️</div>
            <div class="listing-content">
                <h3 class="listing-title">${listing.title}</h3>
                <p class="listing-description">${listing.description}</p>
                <div class="listing-meta">
                    <span class="listing-portions">${listing.availablePortions}/${listing.portions} μερίδες</span>
                    <span class="listing-rating">★ ${avgRating}</span>
                </div>
                <div class="listing-meta">
                    <span>📍 ${locationStr}</span>
                    <span>🕐 ${new Date(listing.pickupTime).toLocaleString('el-GR')}</span>
                </div>
                <div class="listing-actions">
                    <button class="btn-secondary" onclick="deleteListing('${listing.id}')">Διαγραφή</button>
                </div>
            </div>
        `;
        
        listingsGrid.appendChild(card);
    });
}

// Requests rendering
function renderRequests() {
    const currentUser = getCurrentUser();
    const requests = getRequestsByCook(currentUser.id);
    
    const requestsList = document.getElementById('requestsList');
    requestsList.innerHTML = '';

    if (requests.length === 0) {
        requestsList.innerHTML = '<p>Δεν έχετε αιτήματα ακόμα</p>';
        return;
    }

    requests.forEach(request => {
        const listing = getListingById(request.listingId);
        const consumer = getUserById(request.consumerId);
        
        const card = document.createElement('div');
        card.className = 'request-card';
        
        let actionsHTML = '';
        if (request.status === 'pending') {
            actionsHTML = `
                <div class="request-actions">
                    <button class="btn-approve" onclick="approveRequest('${request.id}')">Αποδοχή</button>
                    <button class="btn-reject" onclick="rejectRequest('${request.id}')">Απόρριψη</button>
                </div>
            `;
        } else if (request.status === 'approved') {
            actionsHTML = `
                <div class="request-actions">
                    <button class="btn-confirm" onclick="confirmPickup('${request.id}')">Επιβεβαίωση Παραλαβής</button>
                    <button class="btn-reject" onclick="reportNoShow('${request.id}')">Δεν ήρθε</button>
                </div>
            `;
        } else {
            actionsHTML = `<p>Κατάσταση: ${request.status}</p>`;
        }

        card.innerHTML = `
            <div class="request-header">
                <h3>${listing.title}</h3>
                <span>Κατάσταση: ${request.status}</span>
            </div>
            <div class="request-info">
                <span>👤 ${consumer.username}</span>
                <span>🕐 ${new Date(request.createdAt).toLocaleString('el-GR')}</span>
            </div>
            ${actionsHTML}
        `;
        
        requestsList.appendChild(card);
    });
}

// Profile rendering
function renderProfile() {
    const currentUser = getCurrentUser();
    
    document.getElementById('profileName').textContent = currentUser.username;
    document.getElementById('profileRole').textContent = currentUser.role === 'cook' ? 'Μάγειρας' : currentUser.role === 'admin' ? 'Διαχειριστής' : 'Καταναλωτής';
    document.getElementById('profilePoints').textContent = currentUser.points;
    document.getElementById('offeredCount').textContent = currentUser.offeredPortions;
    document.getElementById('receivedCount').textContent = currentUser.receivedPortions;
    document.getElementById('avgRating').textContent = getAverageRating(currentUser.id);
}

// Admin rendering
function renderAdmin() {
    const monthlyPortions = getMonthlyPortions();
    const topDonor = getTopDonor();
    const topRatedMeal = getTopRatedMeal();

    document.getElementById('monthlyPortions').textContent = monthlyPortions;
    document.getElementById('topDonor').textContent = topDonor ? topDonor.username : '-';
    document.getElementById('topRatedMeal').textContent = topRatedMeal ? topRatedMeal.title : '-';
}
