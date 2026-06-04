// Main Application Logic

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// Create listing
async function handleCreateListing(event) {
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

    try {
        await createListing(listingData);
        
        // Update user stats
        await updateUser(currentUser.id, {
            offeredPortions: currentUser.offeredPortions + listingData.portions
        });
        
        // Refresh current user data
        const updatedUser = await getUserById(currentUser.id);
        setCurrentUser(updatedUser);
        
        closeModal('createListingModal');
        document.getElementById('createListingForm').reset();
        showView('my-listings');
    } catch (error) {
        console.error('Error creating listing:', error);
        alert('Σφάλμα κατά τη δημιουργία αγγελίας');
    }
}

// Request portion
async function requestPortion(listingId) {
    const currentUser = getCurrentUser();
    
    try {
        const listing = await getListingById(listingId);
        
        if (currentUser.points < 1) {
            alert('Δεν έχετε αρκετούς πόντους για να ζητήσετε μερίδα');
            return;
        }

        if (listing.availablePortions <= 0) {
            alert('Δεν υπάρχουν διαθέσιμες μερίδες');
            return;
        }

        // Create request
        await createRequest({
            listingId: listingId,
            consumerId: currentUser.id,
            cookId: listing.cookId
        });

        alert('Το αίτημα στάλθηκε επιτυχώς!');
        await renderFeed();
    } catch (error) {
        console.error('Error requesting portion:', error);
        alert('Σφάλμα κατά την υποβολή αιτήματος');
    }
}

// Delete listing
async function handleDeleteListing(listingId) {
    if (confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε αυτή την αγγελία;')) {
        try {
            await deleteListing(listingId);
            await renderMyListings();
        } catch (error) {
            console.error('Error deleting listing:', error);
            alert('Σφάλμα κατά τη διαγραφή');
        }
    }
}

// Approve request
async function approveRequest(requestId) {
    try {
        const requests = await getRequests();
        const request = requests.find(r => r.id === requestId);
        const listing = await getListingById(request.listingId);
        
        if (listing.availablePortions <= 0) {
            alert('Δεν υπάρχουν διαθέσιμες μερίδες');
            return;
        }

        // Update request status
        await updateRequest(requestId, { status: 'approved' });

        // Decrease available portions
        await updateListing(listing.id, {
            availablePortions: listing.availablePortions - 1
        });

        // Deduct point from consumer
        await deductPoints(request.consumerId, 1);

        alert('Το αίτημα εγκρίθηκε!');
        await renderRequests();
    } catch (error) {
        console.error('Error approving request:', error);
        alert('Σφάλμα κατά την έγκριση');
    }
}

// Reject request
async function rejectRequest(requestId) {
    try {
        await updateRequest(requestId, { status: 'rejected' });
        alert('Το αίτημα απορρίφθηκε');
        await renderRequests();
    } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Σφάλμα κατά την απόρριψη');
    }
}

// Confirm pickup
async function confirmPickup(requestId) {
    try {
        const requests = await getRequests();
        const request = requests.find(r => r.id === requestId);
        const consumer = await getUserById(request.consumerId);

        // Update request status
        await updateRequest(requestId, { status: 'completed' });

        // Update consumer stats
        await updateUser(consumer.id, {
            receivedPortions: consumer.receivedPortions + 1
        });

        // Show rating modal for consumer
        if (getCurrentUser().id === request.consumerId) {
            showRatingModal(requestId);
        } else {
            alert('Η παραλαβή επιβεβαιώθηκε!');
            await renderRequests();
        }
    } catch (error) {
        console.error('Error confirming pickup:', error);
        alert('Σφάλμα κατά την επιβεβαίωση');
    }
}

// Report no-show
async function reportNoShow(requestId) {
    try {
        const requests = await getRequests();
        const request = requests.find(r => r.id === requestId);
        
        // Update request status
        await updateRequest(requestId, { status: 'no-show' });

        // Deduct additional point from consumer
        await deductPoints(request.consumerId, 1);

        alert('Ο χρήστης σημειώθηκε ως no-show και του αφαιρέθηκε 1 πόντος');
        await renderRequests();
    } catch (error) {
        console.error('Error reporting no-show:', error);
        alert('Σφάλμα');
    }
}

// Handle rating
async function handleRating(event) {
    event.preventDefault();
    
    try {
        const requestId = document.getElementById('ratingRequestId').value;
        const requests = await getRequests();
        const request = requests.find(r => r.id === requestId);
        const listing = await getListingById(request.listingId);
        const ratingValue = parseInt(document.getElementById('ratingValue').value);
        const comment = document.getElementById('ratingComment').value;

        if (!ratingValue) {
            alert('Παρακαλώ επιλέξτε βαθμολογία');
            return;
        }

        // Create rating
        await createRating({
            listingId: listing.id,
            cookId: listing.cookId,
            consumerId: request.consumerId,
            rating: ratingValue,
            comment: comment
        });

        // Add points to cook if rating > 3
        if (ratingValue > 3) {
            await addPoints(listing.cookId, 1);
        }

        closeModal('ratingModal');
        document.getElementById('ratingForm').reset();
        
        // Reset stars
        document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
        
        alert('Η αξιολόγηση υποβλήθηκε!');
        await showView('feed');
    } catch (error) {
        console.error('Error handling rating:', error);
        alert('Σφάλμα κατά την υποβολή αξιολόγησης');
    }
}

// Check for ratings that need to be submitted (48h rule)
async function checkPendingRatings() {
    try {
        const requests = await getRequests();
        const now = new Date();
        const ratings = await getRatings();
        
        for (const request of requests) {
            if (request.status === 'completed') {
                const completedAt = new Date(request.createdAt);
                const hoursSinceCompletion = (now - completedAt) / (1000 * 60 * 60);
                
                // Check if rating exists
                const hasRated = ratings.some(r => r.listingId === request.listingId && r.consumerId === request.consumerId);
                
                if (hoursSinceCompletion >= 48 && !hasRated) {
                    // Deduct point for not rating
                    await deductPoints(request.consumerId, 1);
                    // Mark as rated to avoid multiple deductions
                    await createRating({
                        listingId: request.listingId,
                        cookId: request.cookId,
                        consumerId: request.consumerId,
                        rating: 0,
                        comment: 'Auto-rated (no rating submitted)'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error checking pending ratings:', error);
    }
}

// Run rating check every hour
setInterval(checkPendingRatings, 60 * 60 * 1000);
