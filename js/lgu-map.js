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
        SOS: '#C23A22',
        INJURED: '#C23A22',
        TRAPPED: '#A85F00',
        RESCUER: '#146B49',
        VOLUNTEER: '#8B7FD1',
        SAFE: '#4C8DD9',
        OFFLINE: '#98A2B3',
    };

    // The legend is built from STATUS_COLOR rather than written out in the
    // markup, so a colour can never be changed here and left stale in the
    // key — a legend that quietly disagrees with the map is worse than none.
    // Ordered by how urgently a row needs attention, not by object order.
    const LEGEND = [
        { label: 'SOS / Injured', color: STATUS_COLOR.SOS },
        { label: 'Trapped', color: STATUS_COLOR.TRAPPED },
        { label: 'Rescuer', color: STATUS_COLOR.RESCUER },
        { label: 'Volunteer', color: STATUS_COLOR.VOLUNTEER },
        { label: 'Safe / Civilian', color: STATUS_COLOR.SAFE },
        { label: 'Last signal', color: STATUS_COLOR.OFFLINE },
    ];

    function renderLegend() {
        const el = document.getElementById('mapLegend');
        if (!el) return;
        el.innerHTML = LEGEND.map(({ label, color }) =>
            `<div class="legend-item"><span class="l-dot" style="background:${color}"></span>${label}</div>`
        ).join('');
    }

    let impl = null; // set to googleImpl or chartImpl once load() decides

    function onReady(cb) { impl.onReady(cb); }
    function renderMarkers(nodes, onClick) { impl.renderMarkers(nodes, onClick); }
    function drawRouteTo(node) { impl.drawRouteTo(node); }

    // Street/satellite switch, shared by both implementations — Google swaps
    // its own map type, the Leaflet fallback swaps tile layers.
    let basemap = 'street';
    function setBasemap(mode) {
        if (!impl || mode === basemap) return;
        basemap = mode;
        impl.setBasemap(mode);
        document.getElementById('basemapStreet').classList.toggle('is-active', mode === 'street');
        document.getElementById('basemapSatellite').classList.toggle('is-active', mode === 'satellite');
    }

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
                fullscreenControl: false, // top-right is the legend's corner
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
            // 'hybrid' rather than 'satellite' so roads and place names stay on
            // top of the imagery, matching what the Leaflet fallback draws.
            setBasemap(mode) {
                this.onReady(() => map.setMapTypeId(mode === 'satellite' ? 'hybrid' : 'roadmap'));
            },
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
                        strokeColor: '#14213D',
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
        let streetLayer = null, satelliteLayer = null;
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
                attributionControl: true,
            }).setView([window.NABUA_CENTER.lat, window.NABUA_CENTER.lng], 14);

            // Two keyless basemaps behind the Map/Satellite switch: real
            // OpenStreetMap streets (tinted to the cream chart-paper register
            // via CSS, see css/lgu.css) and Esri aerial imagery under Esri's
            // place/boundary labels, so staff can read damage and flooding off
            // the photography while still having street names to dispatch by.
            streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);

            satelliteLayer = L.layerGroup([
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    maxZoom: 19,
                    attribution: 'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
                }),
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                    maxZoom: 19,
                }),
            ]);

            markersLayer = L.layerGroup().addTo(map);

            ready = true;
            readyCallbacks.forEach(cb => cb(map));
            readyCallbacks.length = 0;
        }

        return {
            load,
            onReady(cb) { if (ready) cb(map); else readyCallbacks.push(cb); },
            setBasemap(mode) {
                this.onReady(() => {
                    if (mode === 'satellite') {
                        map.removeLayer(streetLayer);
                        satelliteLayer.addTo(map);
                    } else {
                        map.removeLayer(satelliteLayer);
                        streetLayer.addTo(map);
                    }
                    // The street tint would wash out photography, so the CSS
                    // filter keys off this class.
                    map.getContainer().classList.toggle('is-satellite', mode === 'satellite');
                });
            },
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
                        { color: '#14213D', weight: 2.5, dashArray: '2, 7', opacity: 0.85 }
                    ).addTo(markersLayer);
                    map.panTo([node.lat, node.lng]);
                });
            },
        };
    })();

    function load() {
        renderLegend();
        const key = window.APP_CONFIG && window.APP_CONFIG.GOOGLE_MAPS_API_KEY;
        if (key) {
            impl = googleImpl;
            impl.load(key);
        } else {
            impl = chartImpl;
            impl.load();
        }
    }

    window.lguMap = { onReady, renderMarkers, drawRouteTo, load, setBasemap };
})();
