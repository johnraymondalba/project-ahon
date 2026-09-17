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
    // The bright half of each brand pair, not the *-dark variants: these are
    // fills sitting on a dark map, where the dark variants disappear into it.
    // Matches the citizen map's --color-* tokens dot for dot.
    const STATUS_COLOR = {
        SOS: '#E8452C',
        INJURED: '#E8452C',
        TRAPPED: '#F5A623',
        RESCUER: '#22A06B',
        VOLUNTEER: '#8B7FD1',
        SAFE: '#4C8DD9',
        OFFLINE: '#98A2B3',
        COMMAND: '#4D94FF',
    };

    const MESH_LINK_COLOR = '#2ECC71';

    // The dispatch route has to beat both the dark basemap and the status dots
    // it runs between, so it takes the citizen map's route blue rather than the
    // near-black navy that read as a scratch on a light card.
    const ROUTE_COLOR = '#4D94FF';

    // Google renders its own tiles, so it cannot be inverted by a CSS filter
    // the way the Leaflet basemap is — it needs the palette handed to it.
    // Tuned to land on the same ground as the inverted OSM tiles, so switching
    // between the two implementations is not a change of world. POIs stay off:
    // a restaurant pin is noise next to a rescue report.
    const DARK_MAP_STYLE = [
        { elementType: 'geometry', stylers: [{ color: '#0F131C' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#7C879B' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0E15' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#242B3A' }] },
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2E3647' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A4459' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111A2B' }] },
        { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#141A25' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ];

    // The legend is built from STATUS_COLOR rather than written out in the
    // markup, so a colour can never be changed here and left stale in the
    // key — a legend that quietly disagrees with the map is worse than none.
    // Ordered by how urgently a row needs attention, not by object order.
    // `square: true` is not decoration — the command centre is infrastructure,
    // not a responder, and telling them apart by hue alone would break the
    // shape-before-hue rule the ghost markers already follow.
    const LEGEND = [
        { label: 'SOS / Injured', color: STATUS_COLOR.SOS },
        { label: 'Trapped', color: STATUS_COLOR.TRAPPED },
        { label: 'Rescuer', color: STATUS_COLOR.RESCUER },
        { label: 'Volunteer', color: STATUS_COLOR.VOLUNTEER },
        { label: 'Safe / Civilian', color: STATUS_COLOR.SAFE },
        { label: 'Last signal', color: STATUS_COLOR.OFFLINE },
        { label: 'Command Center', color: STATUS_COLOR.COMMAND, square: true },
    ];

    function renderLegend() {
        const el = document.getElementById('mapLegend');
        if (!el) return;
        el.innerHTML = LEGEND.map(({ label, color, square }) =>
            `<div class="legend-item"><span class="l-dot${square ? ' is-square' : ''}" style="background:${color}"></span>${label}</div>`
        ).join('');
    }

    let impl = null; // set to googleImpl or chartImpl once load() decides

    // Off by default: the link web is context for a dispatcher who asks how
    // this report reached us, not something to read past on every glance.
    let meshVisible = false;

    function onReady(cb) { impl.onReady(cb); }
    function renderMarkers(nodes, onClick) { impl.renderMarkers(nodes, onClick); }
    // The caller passes the team, because the command centre decides who is
    // being suggested. Picking one in here is how the drawn route ended up
    // naming a different team from the one the Details panel recommended.
    function drawRouteTo(node, rescuer) { impl.drawRouteTo(node, rescuer); }

    function toggleMesh() {
        meshVisible = !meshVisible;
        const btn = document.getElementById('meshToggle');
        if (btn) {
            btn.classList.toggle('is-active', meshVisible);
            btn.setAttribute('aria-pressed', String(meshVisible));
        }
        if (impl) impl.drawMesh(window.MESH_NODES);
        return meshVisible;
    }

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
        let map = null, markers = [], meshLines = [], routeLine = null;
        const readyCallbacks = [];
        let ready = false;

        // A square for the command centre, circles for everyone else — the same
        // shape-before-hue split the Leaflet markers make.
        function markerIcon(node) {
            const color = STATUS_COLOR[node.status] || STATUS_COLOR.SAFE;
            if (node.type === 'lgu') {
                return {
                    path: 'M -9,-9 9,-9 9,9 -9,9 z',
                    fillColor: color, fillOpacity: 1,
                    strokeColor: '#ffffff', strokeWeight: 2,
                };
            }
            return {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: color,
                fillOpacity: node.type === 'offline' ? 0.45 : 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            };
        }

        function markerLabel(node) {
            if (node.type === 'lgu') return { text: 'Command Center', color: '#C9D3E3', fontSize: '11px', fontWeight: '700' };
            if (node.type === 'rescuer' || node.type === 'volunteer') {
                return { text: node.name, color: '#C9D3E3', fontSize: '11px', fontWeight: '700' };
            }
            return null;
        }

        window.initLguMap = function () {
            map = new google.maps.Map(document.getElementById('lguMap'), {
                center: window.NABUA_CENTER,
                zoom: 14,
                disableDefaultUI: false,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false, // top-right is the legend's corner
                styles: DARK_MAP_STYLE,
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
                            icon: markerIcon(node),
                            label: markerLabel(node),
                            title: `${node.name} — ${node.status}`,
                            zIndex: node.type === 'lgu' ? 1000 : 1,
                        });
                        marker.addListener('click', () => onClick(node));
                        return marker;
                    });
                    if (meshVisible) this.drawMesh(nodes);
                });
            },
            drawMesh(nodes) {
                this.onReady(() => {
                    meshLines.forEach(l => l.setMap(null));
                    meshLines = [];
                    if (!meshVisible) return;
                    const live = nodes.filter(n => n.type !== 'offline');
                    meshLines = window.meshGraph.build(live).map(e => new google.maps.Polyline({
                        path: [
                            { lat: live[e.a].lat, lng: live[e.a].lng },
                            { lat: live[e.b].lat, lng: live[e.b].lng },
                        ],
                        strokeColor: MESH_LINK_COLOR,
                        strokeOpacity: e.bridge ? 0.3 : 0.55,
                        strokeWeight: e.bridge ? 1 : 1.4,
                        map,
                    }));
                });
            },
            drawRouteTo(node, rescuer) {
                this.onReady(() => {
                    if (routeLine) routeLine.setMap(null);
                    routeLine = null;
                    if (!rescuer || !node) return;
                    routeLine = new google.maps.Polyline({
                        path: [{ lat: rescuer.lat, lng: rescuer.lng }, { lat: node.lat, lng: node.lng }],
                        geodesic: true,
                        strokeColor: ROUTE_COLOR,
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
        let map = null, markersLayer = null, meshLayer = null, routeLine = null;
        let streetLayer = null, satelliteLayer = null;
        const readyCallbacks = [];
        let ready = false;

        // Three marker shapes, because three things are on this map and hue
        // alone cannot separate them: the command centre is a square building
        // glyph, rescue teams are circles carrying their team name, and
        // everyone reporting is an unlabelled circle.
        function nodeIcon(node) {
            const color = STATUS_COLOR[node.status] || STATUS_COLOR.SAFE;

            if (node.type === 'lgu') {
                const html = `
                    <div class="lgu-marker-hq" style="--hq-color:${color}">
                        <i class="fa-solid fa-building-shield"></i>
                        <span class="lgu-marker-label">Command Center</span>
                    </div>`;
                return L.divIcon({ className: 'lgu-marker-icon', html, iconSize: [26, 26], iconAnchor: [13, 13] });
            }

            if (node.type === 'rescuer' || node.type === 'volunteer') {
                const html = `
                    <div class="lgu-marker-team">
                        <div class="lgu-marker-dot" style="background:${color}"></div>
                        <span class="lgu-marker-label">${node.name}</span>
                    </div>`;
                return L.divIcon({ className: 'lgu-marker-icon', html, iconSize: [16, 16], iconAnchor: [8, 8] });
            }

            const html = `<div class="lgu-marker-dot" style="background:${color};opacity:${node.type === 'offline' ? 0.5 : 1}"></div>`;
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

            // Below the markers on purpose: links are context, not the data.
            meshLayer = L.layerGroup().addTo(map);
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
                            icon: nodeIcon(node),
                            title: `${node.name} — ${node.status}`,
                            // HQ sits above the reports it is receiving.
                            zIndexOffset: node.type === 'lgu' ? 1000 : 0,
                        });
                        marker.on('click', () => onClick(node));
                        marker.addTo(markersLayer);
                    });
                    if (meshVisible) this.drawMesh(nodes);
                });
            },
            drawMesh(nodes) {
                this.onReady(() => {
                    meshLayer.clearLayers();
                    if (!meshVisible) return;
                    // Ghosts carry nothing: no live signal means no radio.
                    const live = nodes.filter(n => n.type !== 'offline');
                    const edges = window.meshGraph.build(live);
                    edges.forEach(e => {
                        L.polyline([[live[e.a].lat, live[e.a].lng], [live[e.b].lat, live[e.b].lng]], {
                            color: MESH_LINK_COLOR,
                            weight: e.bridge ? 1 : 1.4,
                            dashArray: e.bridge ? '2, 7' : '5, 7',
                            opacity: e.bridge ? 0.3 : 0.55,
                        }).addTo(meshLayer);
                    });
                });
            },
            drawRouteTo(node, rescuer) {
                this.onReady(() => {
                    if (routeLine) markersLayer.removeLayer(routeLine);
                    routeLine = null;
                    if (!rescuer || !node) return;
                    routeLine = L.polyline(
                        [[rescuer.lat, rescuer.lng], [node.lat, node.lng]],
                        { color: ROUTE_COLOR, weight: 2.5, dashArray: '2, 7', opacity: 0.9 }
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

    window.lguMap = { onReady, renderMarkers, drawRouteTo, load, setBasemap, toggleMesh };
})();
