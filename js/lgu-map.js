/*
  LGU dashboard map layer — real Google Maps JavaScript API integration.

  The API key is never hardcoded: it's read from window.APP_CONFIG
  (js/config.js, gitignored — see js/config.example.js and README.md).
  If no key is configured, this renders a fallback panel instead of trying
  to load Google's script, so the dashboard still demos cleanly.
*/
(function () {
    const STATUS_COLOR = {
        SOS: '#FF4D4D',
        INJURED: '#FF4D4D',
        TRAPPED: '#d97706',
        RESCUER: '#2ECC71',
        VOLUNTEER: '#FF69B4',
        SAFE: '#4D94FF',
        OFFLINE: '#7F8C8D',
    };

    let map = null;
    let markers = [];
    let routeLine = null;
    const readyCallbacks = [];
    let ready = false;

    function markerIcon(color, isGhost) {
        return {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: color,
            fillOpacity: isGhost ? 0.45 : 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
        };
    }

    function onReady(cb) {
        if (ready) cb(map);
        else readyCallbacks.push(cb);
    }

    // Called by the Google Maps script tag once loaded (see loadGoogleMaps below).
    window.initLguMap = function () {
        map = new google.maps.Map(document.getElementById('lguMap'), {
            center: window.NABUA_CENTER,
            zoom: 14,
            disableDefaultUI: false,
            streetViewControl: false,
            mapTypeControl: false,
            styles: [
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            ],
        });
        ready = true;
        readyCallbacks.forEach(cb => cb(map));
        readyCallbacks.length = 0;
    };

    function loadGoogleMaps() {
        const key = window.APP_CONFIG && window.APP_CONFIG.GOOGLE_MAPS_API_KEY;
        const mapEl = document.getElementById('lguMap');
        const fallbackEl = document.getElementById('lguMapFallback');

        if (!key) {
            mapEl.style.display = 'none';
            fallbackEl.style.display = 'flex';
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initLguMap`;
        script.async = true;
        script.onerror = () => {
            mapEl.style.display = 'none';
            fallbackEl.style.display = 'flex';
            fallbackEl.querySelector('.map-fallback-msg').textContent = 'Failed to load Google Maps — check that the API key is valid and Maps JavaScript API is enabled.';
        };
        document.head.appendChild(script);
    }

    function renderMarkers(nodes, onMarkerClick) {
        onReady(() => {
            markers.forEach(m => m.setMap(null));
            markers = nodes.map(node => {
                const color = STATUS_COLOR[node.status] || '#4D94FF';
                const marker = new google.maps.Marker({
                    position: { lat: node.lat, lng: node.lng },
                    map,
                    icon: markerIcon(color, node.type === 'offline'),
                    title: `${node.name} — ${node.status}`,
                });
                marker.addListener('click', () => onMarkerClick(node));
                return marker;
            });
        });
    }

    function drawRouteTo(node) {
        onReady(() => {
            if (routeLine) routeLine.setMap(null);
            const rescuer = window.MESH_NODES.find(n => n.type === 'rescuer');
            if (!rescuer || !node) return;
            routeLine = new google.maps.Polyline({
                path: [{ lat: rescuer.lat, lng: rescuer.lng }, { lat: node.lat, lng: node.lng }],
                geodesic: true,
                strokeColor: '#1d4ed8',
                strokeOpacity: 0.9,
                strokeWeight: 3,
                icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }],
            });
            routeLine.setMap(map);
            map.panTo({ lat: node.lat, lng: node.lng });
        });
    }

    window.lguMap = { onReady, renderMarkers, drawRouteTo, load: loadGoogleMaps };
})();
