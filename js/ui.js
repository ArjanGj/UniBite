// UI Functions

// Photo upload functions
function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('Η φωτογραφία δεν πρέπει να ξεπερνά τα 2MB');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('photoPreviewImg').src = e.target.result;
        document.getElementById('photoPreview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    document.getElementById('listingPhoto').value = '';
    document.getElementById('photoPreviewImg').src = '';
    document.getElementById('photoPreview').classList.add('hidden');
}

function getPhotoBase64() {
    const img = document.getElementById('photoPreviewImg');
    return img.src && img.src !== window.location.href ? img.src : null;
}

async function showView(viewName) {
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
            await renderFeed();
            break;
        case 'map':
            await renderMap();
            break;
        case 'my-listings':
            await renderMyListings();
            break;
        case 'requests':
            await renderRequests();
            break;
        case 'profile':
            await renderProfile();
            break;
        case 'admin':
            await renderAdmin();
            break;
    }
}

function showCreateListingModal() {
    document.getElementById('createListingModal').classList.remove('hidden');
    setTimeout(() => initLocationPicker(), 400);
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
async function renderFeed() {
    try {
        const currentUser = getCurrentUser();
        const cleanupResult = await cleanupExpiredListings();
        const active = cleanupResult?.active || [];
        const inactive = cleanupResult?.inactive || [];
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
            const ratingsMap = {};
            for (const l of sortedListings) {
                if (!(l.cookId in ratingsMap)) {
                    ratingsMap[l.cookId] = await getAverageRating(l.cookId);
                }
            }
            sortedListings.sort((a, b) => ratingsMap[b.cookId] - ratingsMap[a.cookId]);
        }

        const feedList = document.getElementById('feedList');
        feedList.innerHTML = '';

        for (const listing of sortedListings) {
            const cook = await getUserById(listing.cookId);
            const avgRating = await getAverageRating(listing.cookId);
            const isInactive = listing.status === 'inactive' || listing.availablePortions === 0;
            
            // Build location string
            let locationStr = listing.location;
            if (listing.address && listing.area) {
                locationStr = `${listing.address}, ${listing.area}`;
                if (listing.postalCode) locationStr += `, ${listing.postalCode}`;
                if (listing.location) locationStr += ` (${listing.location})`;
            }
            
            const card = document.createElement('div');
            card.className = `listing-card ${isInactive ? 'inactive' : ''}`;
            
            card.innerHTML = `
                <div class="listing-image">${listing.photo ? `<img src="${listing.photo}" alt="${listing.title}" style="width:100%;height:100%;object-fit:cover">` : '🍽️'}</div>
                <div class="listing-content">
                    <h3 class="listing-title">${listing.title}</h3>
                    <p class="listing-description">${listing.description}</p>
                    <div class="listing-meta">
                        <span>👨‍🍳 ${cook ? cook.username : 'Άγνωστος'}</span>
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
        }
    } catch (error) {
        console.error('Error rendering feed:', error);
    }
}

// Map rendering with Leaflet
let map = null;
let markers = [];

async function renderMap() {
    try {
        initMainMap();

        const cleanupResult = await cleanupExpiredListings();
        const active = cleanupResult?.active || [];

        active.forEach(async (listing) => {
            const cook = await getUserById(listing.cookId);
            const avgRating = await getAverageRating(listing.cookId);

            const lat = listing.lat || (38.2466 + (Math.random() - 0.5) * 0.05);
            const lng = listing.lng || (21.7344 + (Math.random() - 0.5) * 0.05);

            let locationStr = listing.location;
            if (listing.address && listing.area) {
                locationStr = `${listing.address}, ${listing.area}`;
                if (listing.postalCode) locationStr += `, ${listing.postalCode}`;
                if (listing.location) locationStr += ` (${listing.location})`;
            }

            const marker = L.marker([lat, lng]).addTo(mainMap);
            marker.bindPopup(`
                <div class="map-popup">
                    <h3>${listing.title}</h3>
                    <p><strong>Μάγειρας:</strong> ${cook ? cook.username : 'Άγνωστος'}</p>
                    <p><strong>Μερίδες:</strong> ${listing.availablePortions}/${listing.portions}</p>
                    <p><strong>Τοποθεσία:</strong> ${locationStr}</p>
                    <p><strong>Ώρα:</strong> ${new Date(listing.pickupTime).toLocaleString('el-GR')}</p>
                    <p><strong>Βαθμολογία:</strong> ★ ${avgRating}</p>
                    ${listing.allergens ? `<p><strong>⚠️ Αλλεργιογόνα:</strong> ${listing.allergens}</p>` : ''}
                    <button onclick="requestPortion('${listing.id}')" class="btn-primary" style="margin-top:10px;width:100%">Ζήτηση μερίδας</button>
                </div>
            `);
            mainMarkers.push(marker);
        });

        // We can't guarantee all markers are added before fitBounds runs due to async map 
        // But Leaflet fitBounds can run as markers are added if needed, or we wait.
        // For better flow, wait for all.
        /* if (mainMarkers.length > 0) {
            const group = L.featureGroup(mainMarkers);
            mainMap.fitBounds(group.getBounds());
        } */
    } catch (error) {
        console.error('Error rendering map:', error);
    }
}

// My Listings rendering
async function renderMyListings() {
    try {
        const currentUser = getCurrentUser();
        const myListings = await getListingsByCook(currentUser.id);
        
        const listingsGrid = document.getElementById('myListings');
        listingsGrid.innerHTML = '';

        if (!myListings || myListings.length === 0) {
            listingsGrid.innerHTML = '<p>Δεν έχετε δημιουργήσει αγγελίες ακόμα</p>';
            return;
        }

        for (const listing of myListings) {
            const avgRating = await getAverageRating(currentUser.id);
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
                        <button class="btn-secondary" onclick="handleDeleteListing('${listing.id}')">Διαγραφή</button>
                    </div>
                </div>
            `;
            
            listingsGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error rendering my listings:', error);
    }
}

// Requests rendering
async function renderRequests() {
    try {
        const currentUser = getCurrentUser();
        const requests = await getRequestsByCook(currentUser.id);
        
        const requestsList = document.getElementById('requestsList');
        requestsList.innerHTML = '';

        if (!requests || requests.length === 0) {
            requestsList.innerHTML = '<p>Δεν έχετε αιτήματα ακόμα</p>';
            return;
        }

        for (const request of requests) {
            const listing = await getListingById(request.listingId);
            const consumer = await getUserById(request.consumerId);
            
            if (!listing || !consumer) continue;

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
        }
    } catch (error) {
        console.error('Error rendering requests:', error);
    }
}

// Profile rendering
async function renderProfile() {
    try {
        const currentUser = getCurrentUser();
        const avgRating = await getAverageRating(currentUser.id);
        
        document.getElementById('profileName').textContent = currentUser.username;
        document.getElementById('profileRole').textContent = currentUser.role === 'cook' ? 'Μάγειρας' : currentUser.role === 'admin' ? 'Διαχειριστής' : 'Καταναλωτής';
        document.getElementById('profilePoints').textContent = currentUser.points;
        document.getElementById('offeredCount').textContent = currentUser.offeredPortions || 0;
        document.getElementById('receivedCount').textContent = currentUser.receivedPortions || 0;
        document.getElementById('avgRating').textContent = avgRating;
    } catch (error) {
        console.error('Error rendering profile:', error);
    }
}

// Admin rendering
async function renderAdmin() {
    try {
        const monthlyPortions = await getMonthlyPortions();
        const topDonor = await getTopDonor();
        const topRatedMeal = await getTopRatedMeal();

        document.getElementById('monthlyPortions').textContent = monthlyPortions || '0';
        document.getElementById('topDonor').textContent = topDonor ? topDonor.username : '-';
        document.getElementById('topRatedMeal').textContent = topRatedMeal ? topRatedMeal.title : '-';
    } catch (error) {
        console.error('Error rendering admin:', error);
    }
}
