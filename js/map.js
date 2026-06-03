// Map functionality for location picker

let locationPickerMap = null;
let locationMarker = null;

// Initialize location picker map
function initLocationPicker() {
    if (locationPickerMap) {
        locationPickerMap.remove();
    }

    // Initialize map centered on Patras
    locationPickerMap = L.map('locationPickerMap').setView([38.2466, 21.7344], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(locationPickerMap);
    
    // Add draggable marker
    locationMarker = L.marker([38.2466, 21.7344], {
        draggable: true
    }).addTo(locationPickerMap);
    
    // Event listeners
    locationPickerMap.on('click', onMapClick);
    locationMarker.on('dragend', onMarkerDrag);
    
    // Initial reverse geocoding
    reverseGeocode(38.2466, 21.7344);
}

// Handle map click
function onMapClick(e) {
    const { lat, lng } = e.latlng;
    locationMarker.setLatLng([lat, lng]);
    reverseGeocode(lat, lng);
}

// Handle marker drag
function onMarkerDrag(e) {
    const { lat, lng } = e.latlng;
    reverseGeocode(lat, lng);
}

// Reverse geocoding - get address from coordinates
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=el`
        );
        const data = await response.json();
        
        if (data.address) {
            // Fill address fields
            document.getElementById('listingAddress').value = data.address.road || data.address.display_name.split(',')[0] || '';
            document.getElementById('listingPostalCode').value = data.address.postcode || '';
            document.getElementById('listingArea').value = data.address.city || data.address.town || data.address.village || 'Πάτρα';
            
            // Store coordinates
            document.getElementById('listingLat').value = lat;
            document.getElementById('listingLng').value = lng;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
    }
}

// Forward geocoding - get coordinates from address
async function searchAddress() {
    const address = document.getElementById('addressSearchInput').value;
    
    if (!address) {
        alert('Παρακαλώ εισάγετε διεύθυνση');
        return;
    }
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Πάτρα, Ελλάδα')}&accept-language=el&limit=5`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            
            // Move marker to new location
            locationMarker.setLatLng([lat, lng]);
            locationPickerMap.setView([lat, lng], 15);
            
            // Fill address fields from result
            reverseGeocode(lat, lng);
        } else {
            alert('Δεν βρέθηκε η διεύθυνση. Προσπαθήστε με πιο συγκεκριμένη περιγραφή.');
        }
    } catch (error) {
        console.error('Forward geocoding error:', error);
        alert('Παρουσιάστηκε σφάλμα κατά την αναζήτηση');
    }
}

// Update marker position from manual address field changes
function updateMarkerFromAddress() {
    const lat = parseFloat(document.getElementById('listingLat').value);
    const lng = parseFloat(document.getElementById('listingLng').value);
    
    if (!isNaN(lat) && !isNaN(lng) && locationMarker) {
        locationMarker.setLatLng([lat, lng]);
        locationPickerMap.setView([lat, lng], 15);
    }
}
