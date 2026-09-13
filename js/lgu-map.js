/*
  LGU dashboard map layer.

  Two implementations behind one shared interface (window.lguMap =
  { onReady, renderMarkers, drawRouteTo, load }), chosen at load() time:

  - Google Maps JavaScript API, when GOOGLE_MAPS_API_KEY is configured
    (js/config.js, gitignored — see js/config.example.js and README.md).
    The key is never hardcoded.
  - A chart-native fallback (Leaflet, no tile layer) when no key is
    configured — the default/judged state of this repo. Mesh nodes plot as
    vector markers directly on the chart-paper background (same graticule
    as the rest of the world), so the LGU dashboard's live chart renders
    with zero external dependencies, exactly like the citizen app's map.
*/
(function () {
    const STATUS_COLOR = {
        SOS: '#E8452C',
        INJURED: '#E8452C',
        TRAPPED: '#8A6015',
        RESCUER: '#2E6B4C',
        VOLUNTEER: '#8B7FD1',
        SAFE: '#3B6FA0',
        OFFLINE: '#8A8F98',
    };

    let impl = null; // set to googleImpl or chartImpl once load() decides

    function onReady(cb) { impl.onReady(cb); }
    function renderMarkers(nodes, onClick) { impl.renderMarkers(nodes, onClick); }
    function drawRouteTo(node) { impl.drawRouteTo(node); }

    // --- GOOGLE MAPS IMPLEMENTATION ---
    const googleImpl = (function () {
        let map = null, markers = [], routeLine = null;
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

        window.initLguMap = function () {
            map = new google.maps.Map(document.getElementById('lguMap'), {
                center: window.NABUA_CENTER,
                zoom: 14,
                disableDefaultUI: false,
                streetViewControl: false,
                mapTypeControl: false,
                styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
            });
            ready = true;
            readyCallbacks.forEach(cb => cb(map));
            readyCallbacks.length = 0;
        };

        function load(key) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initLguMap`;
            script.async = true;
            script.onerror = () => {
                document.getElementById('lguMap').style.display = 'none';
                chartImpl.load(); // fall back to the chart-native map if the key/script is bad
            };
            document.head.appendChild(script);
        }

        return {
            load,
            onReady(cb) { if (ready) cb(map); else readyCallbacks.push(cb); },
            renderMarkers(nodes, onClick) {
                this.onReady(() => {
                    markers.forEach(m => m.setMap(null));
                    markers = nodes.map(node => {
                        const marker = new google.maps.Marker({
                            position: { lat: node.lat, lng: node.lng },
                            map,
                            icon: markerIcon(STATUS_COLOR[node.status] || STATUS_COLOR.SAFE, node.type === 'offline'),
                            title: `${node.name} — ${node.status}`,
                        });
                        marker.addListener('click', () => onClick(node));
                        return marker;
                    });
                });
            },
            drawRouteTo(node) {
                this.onReady(() => {
                    if (routeLine) routeLine.setMap(null);
                    const rescuer = window.MESH_NODES.find(n => n.type === 'rescuer');
                    if (!rescuer || !node) return;
                    routeLine = new google.maps.Polyline({
                        path: [{ lat: rescuer.lat, lng: rescuer.lng }, { lat: node.lat, lng: node.lng }],
                        geodesic: true,
                        strokeColor: '#0A1628',
                        strokeOpacity: 0.9,
                        strokeWeight: 3,
                        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }],
                    });
                    routeLine.setMap(map);
                    map.panTo({ lat: node.lat, lng: node.lng });
                });
            },
        };
    })();

    // --- CHART-NATIVE FALLBACK (no key, no tiles) ---
    const chartImpl = (function () {
        let map = null, markersLayer = null, routeLine = null;
        const readyCallbacks = [];
        let ready = false;

        function dotIcon(color, isGhost) {
            const html = `<div class="lgu-marker-dot" style="background:${color};opacity:${isGhost ? 0.5 : 1}"></div>`;
            return L.divIcon({ className: 'lgu-marker-icon', html, iconSize: [16, 16], iconAnchor: [8, 8] });
        }

        function load() {
            document.getElementById('lguMapFallback').style.display = 'none';
            const mapEl = document.getElementById('lguMap');
            mapEl.style.display = 'block';

            map = L.map(mapEl, {
                zoomControl: true,
                attributionControl: false,
            }).setView([window.NABUA_CENTER.lat, window.NABUA_CENTER.lng], 14);
            markersLayer = L.layerGroup().addTo(map);

            ready = true;
            readyCallbacks.forEach(cb => cb(map));
            readyCallbacks.length = 0;
        }

        return {
            load,
            onReady(cb) { if (ready) cb(map); else readyCallbacks.push(cb); },
            renderMarkers(nodes, onClick) {
                this.onReady(() => {
                    markersLayer.clearLayers();
                    nodes.forEach(node => {
                        const marker = L.marker([node.lat, node.lng], {
                            icon: dotIcon(STATUS_COLOR[node.status] || STATUS_COLOR.SAFE, node.type === 'offline'),
                            title: `${node.name} — ${node.status}`,
                        });
                        marker.on('click', () => onClick(node));
                        marker.addTo(markersLayer);
                    });
                });
            },
            drawRouteTo(node) {
                this.onReady(() => {
                    if (routeLine) markersLayer.removeLayer(routeLine);
                    const rescuer = window.MESH_NODES.find(n => n.type === 'rescuer');
                    if (!rescuer || !node) return;
                    routeLine = L.polyline(
                        [[rescuer.lat, rescuer.lng], [node.lat, node.lng]],
                        { color: '#0A1628', weight: 2.5, dashArray: '2, 7', opacity: 0.85 }
                    ).addTo(markersLayer);
                    map.panTo([node.lat, node.lng]);
                });
            },
        };
    })();

    function load() {
        const key = window.APP_CONFIG && window.APP_CONFIG.GOOGLE_MAPS_API_KEY;
        if (key) {
            impl = googleImpl;
            impl.load(key);
        } else {
            impl = chartImpl;
            impl.load();
        }
    }

    window.lguMap = { onReady, renderMarkers, drawRouteTo, load };
})();
