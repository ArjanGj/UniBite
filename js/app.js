// Main Application Logic

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// Create listing
function handleCreateListing(event) {
    event.preventDefault();
    
    const currentUser = getCurrentUser();
    
    const listingData = {
        cookId: currentUser.id,
        title: document.getElementById('listingTitle').value,
        description: document.getElementById('listingDescription').value,
        portions: parseInt(document.getElementById('listingPortions').value),
        availablePortions: parseInt(document.getElementById('listingPortions').value),
        location: document.getElementById('listingDetails').value,
        pickupTime: document.getElementById('listingPickupTime').value,
        allergens: document.getElementById('listingAllergens').value,
        photo: getPhotoBase64(),
        // New location fields
        address: document.getElementById('listingAddress').value,
        postalCode: document.getElementById('listingPostalCode').value,
        area: document.getElementById('listingArea').value,
        lat: parseFloat(document.getElementById('listingLat').value),
        lng: parseFloat(document.getElementById('listingLng').value)
    };

    // Validate coordinates
    if (isNaN(listingData.lat) || isNaN(listingData.lng)) {
        alert('Παρακαλώ επιλέξτε τοποθεσία στον χάρτη');
        return;
    }

    createListing(listingData);
    
    // Update user stats
    updateUser(currentUser.id, {
        offeredPortions: currentUser.offeredPortions + listingData.portions
    });
    
    // Refresh current user data
    const updatedUser = getUserById(currentUser.id);
    setCurrentUser(updatedUser);
    
    closeModal('createListingModal');
    document.getElementById('createListingForm').reset();
    showView('my-listings');
}

// Request portion
function requestPortion(listingId) {
    const currentUser = getCurrentUser();
    const listing = getListingById(listingId);
    
    if (currentUser.points < 1) {
        alert('Δεν έχετε αρκετούς πόντους για να ζητήσετε μερίδα');
        return;
    }

    if (listing.availablePortions <= 0) {
        alert('Δεν υπάρχουν διαθέσιμες μερίδες');
        return;
    }

    // Create request
    createRequest({
        listingId: listingId,
        consumerId: currentUser.id,
        cookId: listing.cookId
    });

    alert('Το αίτημα στάλθηκε επιτυχώς!');
    renderFeed();
}

// Delete listing
function deleteListing(listingId) {
    if (confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε αυτή την αγγελία;')) {
        deleteListing(listingId);
        renderMyListings();
    }
}

// Approve request
function approveRequest(requestId) {
    const request = getRequests().find(r => r.id === requestId);
    const listing = getListingById(request.listingId);
    const currentUser = getCurrentUser();

    if (listing.availablePortions <= 0) {
        alert('Δεν υπάρχουν διαθέσιμες μερίδες');
        return;
    }

    // Update request status
    updateRequest(requestId, { status: 'approved' });

    // Decrease available portions
    updateListing(listing.id, {
        availablePortions: listing.availablePortions - 1
    });

    // Deduct point from consumer
    deductPoints(request.consumerId, 1);

    alert('Το αίτημα εγκρίθηκε!');
    renderRequests();
}

// Reject request
function rejectRequest(requestId) {
    updateRequest(requestId, { status: 'rejected' });
    alert('Το αίτημα απορρίφθηκε');
    renderRequests();
}

// Confirm pickup
function confirmPickup(requestId) {
    const request = getRequests().find(r => r.id === requestId);
    const consumer = getUserById(request.consumerId);
    const currentUser = getCurrentUser();

    // Update request status
    updateRequest(requestId, { status: 'completed' });

    // Update consumer stats
    updateUser(consumer.id, {
        receivedPortions: consumer.receivedPortions + 1
    });

    // Show rating modal for consumer
    if (getCurrentUser().id === request.consumerId) {
        showRatingModal(requestId);
    } else {
        alert('Η παραλαβή επιβεβαιώθηκε!');
        renderRequests();
    }
}

// Report no-show
function reportNoShow(requestId) {
    const request = getRequests().find(r => r.id === requestId);
    const consumer = getUserById(request.consumerId);

    // Update request status
    updateRequest(requestId, { status: 'no-show' });

    // Deduct additional point from consumer
    deductPoints(consumer.id, 1);

    alert('Ο χρήστης σημειώθηκε ως no-show και του αφαιρέθηκε 1 πόντος');
    renderRequests();
}

// Handle rating
function handleRating(event) {
    event.preventDefault();
    
    const requestId = document.getElementById('ratingRequestId').value;
    const request = getRequests().find(r => r.id === requestId);
    const listing = getListingById(request.listingId);
    const ratingValue = parseInt(document.getElementById('ratingValue').value);
    const comment = document.getElementById('ratingComment').value;

    if (!ratingValue) {
        alert('Παρακαλώ επιλέξτε βαθμολογία');
        return;
    }

    // Create rating
    createRating({
        listingId: listing.id,
        cookId: listing.cookId,
        consumerId: request.consumerId,
        rating: ratingValue,
        comment: comment
    });

    // Add points to cook if rating > 3
    if (ratingValue > 3) {
        addPoints(listing.cookId, 1);
    }

    closeModal('ratingModal');
    document.getElementById('ratingForm').reset();
    
    // Reset stars
    document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
    
    alert('Η αξιολόγηση υποβλήθηκε!');
    showView('feed');
}

// Check for ratings that need to be submitted (48h rule)
// This should be called periodically
function checkPendingRatings() {
    const requests = getRequests();
    const now = new Date();
    
    requests.forEach(request => {
        if (request.status === 'completed') {
            const completedAt = new Date(request.createdAt);
            const hoursSinceCompletion = (now - completedAt) / (1000 * 60 * 60);
            
            // Check if rating exists
            const ratings = getRatings();
            const hasRated = ratings.some(r => r.listingId === request.listingId && r.consumerId === request.consumerId);
            
            if (hoursSinceCompletion >= 48 && !hasRated) {
                // Deduct point for not rating
                deductPoints(request.consumerId, 1);
                // Mark as rated to avoid multiple deductions
                createRating({
                    listingId: request.listingId,
                    cookId: request.cookId,
                    consumerId: request.consumerId,
                    rating: 0,
                    comment: 'Auto-rated (no rating submitted)'
                });
            }
        }
    });
}

// Run rating check every hour
setInterval(checkPendingRatings, 60 * 60 * 1000);
