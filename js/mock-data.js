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
const MESH_NODES = [
    { id: 'N01', name: 'Rosa D.',      type: 'senior',    status: 'INJURED',  lat: 13.4062, lng: 123.2951, needs: { water: true, meds: true },  flags: { elder: true },  lastSignalMin: 2,  town: 'Nabua' },
    { id: 'N02', name: 'Rescue Team 3',type: 'rescuer',   status: 'RESCUER',  lat: 13.4031, lng: 123.2988, needs: {},                            flags: {},               lastSignalMin: 0,  town: 'Nabua' },
    { id: 'N03', name: 'Mark T.',      type: 'civilian',  status: 'TRAPPED',  lat: 13.4078, lng: 123.2994, needs: { food: true, water: true },   flags: {},               lastSignalMin: 5,  town: 'Nabua' },
    { id: 'N04', name: 'Unit 7 SOS',   type: 'sos',       status: 'SOS',      lat: 13.4019, lng: 123.2933, needs: { meds: true },                flags: { infant: true }, lastSignalMin: 1,  town: 'Nabua' },
    { id: 'N05', name: 'Liza P.',      type: 'civilian',  status: 'SAFE',     lat: 13.4055, lng: 123.3005, needs: {},                            flags: {},               lastSignalMin: 3,  town: 'Nabua' },
    { id: 'N06', name: 'Node 12',      type: 'offline',   status: 'OFFLINE',  lat: 13.4090, lng: 123.2960, needs: { water: true },               flags: {},               lastSignalMin: 47, town: 'Nabua' },
    { id: 'N07', name: 'Jun V. (PWD)', type: 'senior',    status: 'TRAPPED',  lat: 13.4008, lng: 123.2970, needs: { meds: true, water: true },   flags: { pwd: true },    lastSignalMin: 8,  town: 'Nabua' },
    { id: 'N08', name: 'Volunteer Ana',type: 'volunteer', status: 'VOLUNTEER',lat: 13.4070, lng: 123.2920, needs: {},                            flags: {},               lastSignalMin: 1,  town: 'Nabua' },
    { id: 'N09', name: 'Family Cruz',  type: 'civilian',  status: 'INJURED',  lat: 13.4102, lng: 123.3011, needs: { food: true, meds: true },    flags: { infant: true }, lastSignalMin: 4,  town: 'Nabua-Naga corridor' },
    { id: 'N10', name: 'Node 4',       type: 'offline',   status: 'OFFLINE',  lat: 13.3985, lng: 123.2999, needs: {},                            flags: {},               lastSignalMin: 92, town: 'Nabua' },
    { id: 'N11', name: 'Rescue Team 1',type: 'rescuer',   status: 'RESCUER',  lat: 13.4045, lng: 123.2882, needs: {},                            flags: {},               lastSignalMin: 0,  town: 'Nabua-Naga corridor' },
    { id: 'N12', name: 'Elena S.',     type: 'senior',    status: 'SAFE',     lat: 13.4120, lng: 123.2940, needs: {},                            flags: { elder: true },  lastSignalMin: 6,  town: 'Nabua-Naga corridor' },
    { id: 'N13', name: 'Carlo M.',     type: 'civilian',  status: 'TRAPPED',  lat: 13.3999, lng: 123.3040, needs: { water: true },               flags: {},               lastSignalMin: 12, town: 'Nabua' },
];

// Central reference for the "You" node on the citizen app.
const SELF_NODE_START = { lat: 13.4045, lng: 123.2968 };

if (typeof window !== 'undefined') {
    window.NABUA_CENTER = NABUA_CENTER;
    window.MESH_NODES = MESH_NODES;
    window.SELF_NODE_START = SELF_NODE_START;
}
