/*
  Shared mock mesh dataset for the iFlood / Project AHON prototype.

  There is no real BLE/LoRa hardware for this demo, so this file stands in
  for what a gateway node would normally receive from the mesh: a flat list
  of reporting devices scattered around Nabua and the Naga City corridor,
  Camarines Sur — the flood-prone area the pitch targets.

  Both citizen.html and lgu.html load this file directly via <script src>
  (no bundler in this project), so it just defines globals on `window`.
  mesh-simulator.js is the only thing that mutates MESH_NODES afterwards.
*/

// Anchor point used by both the citizen map and the LGU dashboard map.
const NABUA_CENTER = { lat: 13.4045, lng: 123.2968 };

// type -> what it means for rendering + triage.
// 'offline' nodes are "ghost nodes": last known position/status, no live signal.
//
// `medical` is what that person filled into their own profile and chose to
// carry on the mesh. Only a rescuer ever sees it (see js/citizen-rescuer.js);
// plenty of nodes have none, because in a real evacuation plenty of people
// never finish the form — the field renders "Not provided" rather than
// pretending the absence is a negative result.
const MESH_NODES = [
    { id: 'N01', name: 'Rosa D.',      type: 'senior',    status: 'INJURED',  lat: 13.4062, lng: 123.2951, needs: { water: true, meds: true },  flags: { elder: true },  lastSignalMin: 2,  medical: { blood: 'O+', allergies: 'Penicillin', conditions: 'Hypertension' }, town: 'Nabua' },
    { id: 'N02', name: 'Rescue Team 3',type: 'rescuer',   status: 'RESCUER',  lat: 13.4031, lng: 123.2988, needs: {},                            flags: {},               lastSignalMin: 0,  town: 'Nabua' },
    { id: 'N03', name: 'Mark T.',      type: 'civilian',  status: 'TRAPPED',  lat: 13.4078, lng: 123.2994, needs: { food: true, water: true },   flags: {},               lastSignalMin: 5,  medical: { blood: 'A+', allergies: 'None', conditions: 'Asthma' }, town: 'Nabua' },
    { id: 'N04', name: 'Unit 7 SOS',   type: 'sos',       status: 'SOS',      lat: 13.4019, lng: 123.2933, needs: { meds: true },                flags: { infant: true }, lastSignalMin: 1,  medical: { blood: 'B+', allergies: 'None', conditions: 'Infant on board, 7 months' }, town: 'Nabua' },
    { id: 'N05', name: 'Liza P.',      type: 'civilian',  status: 'SAFE',     lat: 13.4055, lng: 123.3005, needs: {},                            flags: {},               lastSignalMin: 3,  medical: null, town: 'Nabua' },
    { id: 'N06', name: 'Node 12',      type: 'offline',   status: 'OFFLINE',  lat: 13.4090, lng: 123.2960, needs: { water: true },               flags: {},               lastSignalMin: 47, town: 'Nabua' },
    { id: 'N07', name: 'Jun V. (PWD)', type: 'senior',    status: 'TRAPPED',  lat: 13.4008, lng: 123.2970, needs: { meds: true, water: true },   flags: { pwd: true },    lastSignalMin: 8,  medical: { blood: 'AB-', allergies: 'Sulfa drugs', conditions: 'Wheelchair user, diabetic' }, town: 'Nabua' },
    { id: 'N08', name: 'Volunteer Ana',type: 'volunteer', status: 'VOLUNTEER',lat: 13.4070, lng: 123.2920, needs: {},                            flags: {},               lastSignalMin: 1,  town: 'Nabua' },
    { id: 'N09', name: 'Family Cruz',  type: 'civilian',  status: 'INJURED',  lat: 13.4102, lng: 123.3011, needs: { food: true, meds: true },    flags: { infant: true }, lastSignalMin: 4,  medical: { blood: 'O-', allergies: 'None', conditions: 'Infant, 2 yrs' }, town: 'Nabua-Naga corridor' },
    { id: 'N10', name: 'Node 4',       type: 'offline',   status: 'OFFLINE',  lat: 13.3985, lng: 123.2999, needs: {},                            flags: {},               lastSignalMin: 92, town: 'Nabua' },
    { id: 'N11', name: 'Rescue Team 1',type: 'rescuer',   status: 'RESCUER',  lat: 13.4045, lng: 123.2882, needs: {},                            flags: {},               lastSignalMin: 0,  town: 'Nabua-Naga corridor' },
    { id: 'N12', name: 'Elena S.',     type: 'senior',    status: 'SAFE',     lat: 13.4120, lng: 123.2940, needs: {},                            flags: { elder: true },  lastSignalMin: 6,  medical: { blood: 'A-', allergies: 'None', conditions: 'Pacemaker' }, town: 'Nabua-Naga corridor' },
    { id: 'N13', name: 'Carlo M.',     type: 'civilian',  status: 'TRAPPED',  lat: 13.3999, lng: 123.3040, needs: { water: true },               flags: {},               lastSignalMin: 12, medical: null, town: 'Nabua' },
];

// The LGU Command Center itself — the gateway every report is ultimately
// travelling toward, and what the citizen app's "N hops to LGU" is counting
// toward. It is a node, not just a map anchor: without it on the mesh there is
// nothing for that hop count to point at. Placed at the Nabua municipal hall,
// and pushed onto MESH_NODES so it plots and relays like any other node.
const LGU_HQ = {
    id: 'LGU', name: 'LGU Command Center', type: 'lgu', status: 'COMMAND',
    lat: 13.4088, lng: 123.2871, needs: {}, flags: {}, lastSignalMin: 0, town: 'Nabua',
};
MESH_NODES.push(LGU_HQ);

// Central reference for the "You" node on the citizen app.
const SELF_NODE_START = { lat: 13.4045, lng: 123.2968 };

if (typeof window !== 'undefined') {
    window.NABUA_CENTER = NABUA_CENTER;
    window.MESH_NODES = MESH_NODES;
    window.LGU_HQ = LGU_HQ;
    window.SELF_NODE_START = SELF_NODE_START;
}

// Node.js reuse (server/index.js loads this same file as the seed dataset
// for the live-sync server, so the two never drift apart).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NABUA_CENTER, MESH_NODES, LGU_HQ, SELF_NODE_START };
}
