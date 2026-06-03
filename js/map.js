// Map functionality for location picker using Google Maps

let locationPickerMap = null;
let locationMarker = null;
let mainMap = null;
let mainMarkers = [];

// Global init function called by Google Maps API
function initMap() {
    console.log('Google Maps API loaded');
}

// Initialize location picker map
function initLocationPicker() {
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        alert('Το Google Maps API δεν φορτώθηκε. Ελέγξτε το API key.');
        return;
    }

    if (locationPickerMap) {
        // Clear existing map
        document.getElementById('locationPickerMap').innerHTML = '';
    }

    // Initialize map centered on Patras
    locationPickerMap = new google.maps.Map(document.getElementById('locationPickerMap'), {
        center: { lat: 38.2466, lng: 21.7344 },
        zoom: 13,
        mapTypeId: 'roadmap'
    });
    
    // Add draggable marker
    locationMarker = new google.maps.Marker({
        position: { lat: 38.2466, lng: 21.7344 },
        map: locationPickerMap,
        draggable: true,
        title: 'Τοποθεσία παράδοσης'
    });
    
    // Event listeners
    locationPickerMap.addListener('click', onMapClick);
    locationMarker.addListener('dragend', onMarkerDrag);
    
    // Initial reverse geocoding
    reverseGeocode(38.2466, 21.7344);
}

// Handle map click
function onMapClick(e) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    locationMarker.setPosition({ lat, lng });
    reverseGeocode(lat, lng);
}

// Handle marker drag
function onMarkerDrag(e) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    reverseGeocode(lat, lng);
}

// Reverse geocoding - get address from coordinates using Google Maps Geocoding API
function reverseGeocode(lat, lng) {
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        return;
    }

    const geocoder = new google.maps.Geocoder();
    const latlng = { lat: lat, lng: lng };

    geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const addressComponents = results[0].address_components;
            
            // Extract address components
            let street = '';
            let postalCode = '';
            let area = '';
            
            addressComponents.forEach(component => {
                if (component.types.includes('route')) {
                    street = component.long_name;
                } else if (component.types.includes('postal_code')) {
                    postalCode = component.long_name;
                } else if (component.types.includes('locality') || component.types.includes('administrative_area_level_3')) {
                    area = component.long_name;
                }
            });

            // Fill address fields
            document.getElementById('listingAddress').value = street || results[0].formatted_address.split(',')[0] || '';
            document.getElementById('listingPostalCode').value = postalCode || '';
            document.getElementById('listingArea').value = area || 'Πάτρα';
            
            // Store coordinates
            document.getElementById('listingLat').value = lat;
            document.getElementById('listingLng').value = lng;
        } else {
            console.error('Reverse geocoding failed:', status);
        }
    });
}

// Forward geocoding - get coordinates from address using Google Maps Places Autocomplete
function searchAddress() {
    const address = document.getElementById('addressSearchInput').value;
    
    if (!address) {
        alert('Παρακαλώ εισάγετε διεύθυνση');
        return;
    }

    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        return;
    }

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: address + ', Πάτρα, Ελλάδα' }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();
            
            // Move marker to new location
            locationMarker.setPosition({ lat, lng });
            locationPickerMap.setCenter({ lat, lng });
            locationPickerMap.setZoom(15);
            
            // Fill address fields from result
            reverseGeocode(lat, lng);
        } else {
            alert('Δεν βρέθηκε η διεύθυνση. Προσπαθήστε με πιο συγκεκριμένη περιγραφή.');
        }
    });
}

// Update marker position from manual address field changes
function updateMarkerFromAddress() {
    const lat = parseFloat(document.getElementById('listingLat').value);
    const lng = parseFloat(document.getElementById('listingLng').value);
    
    if (!isNaN(lat) && !isNaN(lng) && locationMarker) {
        locationMarker.setPosition({ lat, lng });
        locationPickerMap.setCenter({ lat, lng });
        locationPickerMap.setZoom(15);
    }
}
