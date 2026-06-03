// Map functionality using Leaflet (free, no API key needed)

let locationPickerMap = null;
let locationMarker = null;
let mainMap = null;
let mainMarkers = [];

// Initialize location picker map (used in modal)
function initLocationPicker() {
    const container = document.getElementById('locationPickerMap');
    if (!container) return;

    // If map already exists, remove it first
    if (locationPickerMap) {
        locationPickerMap.remove();
        locationPickerMap = null;
    }

    // Center on Patras
    locationPickerMap = L.map('locationPickerMap').setView([38.2466, 21.7344], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(locationPickerMap);

    // Draggable marker
    locationMarker = L.marker([38.2466, 21.7344], { draggable: true }).addTo(locationPickerMap);

    // Click on map moves marker
    locationPickerMap.on('click', function(e) {
        const { lat, lng } = e.latlng;
        locationMarker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
    });

    // Drag marker
    locationMarker.on('dragend', function() {
        const { lat, lng } = locationMarker.getLatLng();
        reverseGeocode(lat, lng);
    });

    // Initial reverse geocode
    reverseGeocode(38.2466, 21.7344);

    // Fix Leaflet map size inside modal - needs longer delay
    setTimeout(() => {
        locationPickerMap.invalidateSize();
        locationPickerMap.setView([38.2466, 21.7344], 13);
    }, 500);
    setTimeout(() => locationPickerMap.invalidateSize(), 1000);
}

// Initialize main map (feed/map view)
function initMainMap() {
    const container = document.getElementById('map');
    if (!container) return;

    if (mainMap) {
        mainMap.remove();
        mainMap = null;
    }

    mainMap = L.map('map').setView([38.2466, 21.7344], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mainMap);

    // Add markers for existing listings
    renderMapMarkers();

    setTimeout(() => mainMap.invalidateSize(), 300);
}

// Render listing markers on main map
function renderMapMarkers() {
    if (!mainMap) return;

    // Remove old markers
    mainMarkers.forEach(m => m.remove());
    mainMarkers = [];

    const listings = getListings ? getListings() : [];
    listings.forEach(listing => {
        if (!listing.active) return;
        const lat = parseFloat(listing.lat);
        const lng = parseFloat(listing.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const marker = L.marker([lat, lng]).addTo(mainMap);
        marker.bindPopup(`
            <div class="map-popup">
                <h3>${listing.title}</h3>
                <p>👨‍🍳 ${listing.cookName}</p>
                <p>🍽️ ${listing.portions} μερίδες</p>
                <p>📍 ${listing.address || ''}</p>
                <button onclick="requestListing('${listing.id}')" class="btn-primary" style="width:100%;margin-top:8px">Αίτημα</button>
            </div>
        `);
        mainMarkers.push(marker);
    });
}

// Reverse geocoding using OpenStreetMap Nominatim (free)
function reverseGeocode(lat, lng) {
    document.getElementById('listingLat').value = lat;
    document.getElementById('listingLng').value = lng;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=el`)
        .then(res => res.json())
        .then(data => {
            const addr = data.address || {};
            const street = (addr.road || '') + (addr.house_number ? ' ' + addr.house_number : '');
            const postal = addr.postcode || '';
            const area = addr.city || addr.town || addr.village || addr.suburb || 'Πάτρα';

            document.getElementById('listingAddress').value = street;
            document.getElementById('listingPostalCode').value = postal;
            document.getElementById('listingArea').value = area;
        })
        .catch(err => console.error('Reverse geocoding error:', err));
}

// Forward geocoding - search address
function searchAddress() {
    const address = document.getElementById('addressSearchInput').value;
    if (!address) {
        alert('Παρακαλώ εισάγετε διεύθυνση');
        return;
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Πάτρα, Ελλάδα')}&limit=1&accept-language=el`)
        .then(res => res.json())
        .then(results => {
            if (results && results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lng = parseFloat(results[0].lon);

                locationMarker.setLatLng([lat, lng]);
                locationPickerMap.setView([lat, lng], 16);
                reverseGeocode(lat, lng);
            } else {
                alert('Δεν βρέθηκε η διεύθυνση. Δοκιμάστε πιο συγκεκριμένη περιγραφή.');
            }
        })
        .catch(err => {
            console.error('Search error:', err);
            alert('Σφάλμα αναζήτησης. Δοκιμάστε ξανά.');
        });
}

// Called by Google Maps (no-op, kept for compatibility)
function initMap() {}
