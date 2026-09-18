# DJI Mavic 3M Circle Mission Generator

A browser-only, Leaflet/OSM preview tool for designing RF antenna-pattern circle routes and exporting DJI WPML KMZ archives. Open `index.html` directly, or serve this folder statically. It needs network access only for Leaflet, OpenStreetMap tiles, and JSZip CDN libraries.

Set **Mission / project name** before export. The name is embedded as KML document metadata and becomes the basis of the `.kmz` filename, which DJI Pilot 2 uses as the route name on import.

## DJI WPML implementation

Each KMZ contains `template.kml` and `waylines.wpml` at its root. It uses WPML 1.0.2, WGS84 coordinates, Mavic 3M `droneEnumValue` **77**, `droneSubEnumValue` **2**, and Mavic 3M payload **68**—the values in DJI’s published WPML common-elements documentation. The generated route is a single `templateId`/`waylineId` of `0`, with continuous zero-based waypoint indexes and no duplicate closing waypoint.

DJI references:

- [WPML overview and KMZ layout](https://developer.dji.com/doc/cloud-api-tutorial/en/api-reference/dji-wpml/overview.html)
- [Template file fields](https://developer.dji.com/doc/cloud-api-tutorial/en/api-reference/dji-wpml/template-kml.html)
- [Execution file fields](https://developer.dji.com/doc/cloud-api-tutorial/en/api-reference/dji-wpml/waylines-wpml.html)
- [Aircraft and payload enum fields](https://developer.dji.com/doc/cloud-api-tutorial/en/api-reference/dji-wpml/common-element.html)

## Checks

The UI validates position, mission values, XML well-formedness, and reads the generated ZIP back to confirm both DJI files exist. Its deterministic geodesic calculations use a 6,371,008.8m mean Earth radius and include calculated distances in the waypoint table. Use the reference-inspector control with a Pilot 2-exported KMZ to compare actual fields before operational use.

Open `tests.html` in a modern browser to run the geometry, heading, XML/model and deterministic-output checks.

## Flight safety

Generated missions are planning artifacts. Import and inspect every waypoint, altitude reference, speed, yaw, RTH/lost-link behavior, and finish action in DJI Pilot 2. Confirm local regulations, airspace, terrain, obstacles, VLOS, antenna mounting and aircraft balance.
