const $ = (id) => document.getElementById(id);
let map,
  centerMarker,
  circle,
  line,
  route,
  markers = [];
function values() {
  return {
    lat: +$("lat").value,
    lng: +$("lng").value,
    radius: +$("radius").value,
    altitude: +$("altitude").value,
    count: +$("count").value,
    startAzimuth: +$("startAzimuth").value,
    direction: $("direction").value,
    speed: +$("speed").value,
    altRef: $("altRef").value,
    headingMode: $("headingMode").value,
    heading: +$("heading").value,
    finish: $("finish").value,
    lost: $("lost").value,
    name: "RF Circle Mission",
  };
}
function validate(o) {
  let e = [];
  if (!Number.isFinite(o.lat) || o.lat < -90 || o.lat > 90)
    e.push("Latitude must be between −90 and 90.");
  if (!Number.isFinite(o.lng) || o.lng < -180 || o.lng > 180)
    e.push("Longitude must be between −180 and 180.");
  if (!(o.radius > 0)) e.push("Radius must be greater than 0.");
  if (!(o.altitude > 0)) e.push("Altitude must be greater than 0.");
  if (!(o.speed > 0 && o.speed <= 15))
    e.push("Speed must be 0–15 m/s (conservative WPML UI limit).");
  if (!Number.isInteger(o.count) || o.count < 3 || o.count > 65535)
    e.push("Waypoint count must be an integer from 3 to 65,535.");
  if (!Number.isFinite(o.heading)) e.push("Heading must be valid.");
  return e;
}
function applyPastedCenter() {
  const match = $("centerPaste")
    .value.trim()
    .match(/^\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*$/);
  if (!match) {
    $("errors").textContent =
      "Paste coordinates as latitude, longitude (for example: 46.73409963984678, 16.17774508632081).";
    return;
  }
  const lat = Number(match[1]),
    lng = Number(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    $("errors").textContent = "Pasted latitude or longitude is out of range.";
    return;
  }
  $("lat").value = lat;
  $("lng").value = lng;
  $("errors").textContent = "";
  redraw(true);
}
function withHeadings(o, pts) {
  return pts.map((p, i) => {
    let h = o.heading;
    if (o.headingMode === "center")
      h = calculateBearing(p, { lat: o.lat, lng: o.lng });
    if (o.headingMode === "away")
      h = calculateBearing({ lat: o.lat, lng: o.lng }, p);
    if (o.headingMode === "tangent")
      h = calculateBearing(p, pts[(i + 1) % pts.length]);
    return { ...p, heading: normalize(h) };
  });
}
function mission() {
  const o = values(),
    errors = validate(o);
  $("errors").textContent = errors.join(" ");
  if (errors.length) return null;
  const pts = withHeadings(o, generateCirclePoints(o));
  if (pts.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng))) {
    $("errors").textContent = "Generated coordinates are invalid.";
    return null;
  }
  return {
    o,
    pts,
    template: generateTemplateKml(o, pts),
    waylines: generateWaylinesWpml(o, pts),
  };
}
function fmt(n, d = 1) {
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
}
function redraw(fit = false) {
  const m = mission();
  if (!m) return;
  $("spacing").value = fmt(360 / m.o.count, 2);
  $("headingWrap").style.display = ["fixed", "initial"].includes(
    m.o.headingMode,
  )
    ? "grid"
    : "none";
  $("mapCenter").textContent = `${m.o.lat.toFixed(6)}, ${m.o.lng.toFixed(6)}`;
  const ll = [m.o.lat, m.o.lng];
  if (!map) {
    map = L.map("map").setView(ll, 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    map.on("click", (e) => {
      $("lat").value = e.latlng.lat.toFixed(6);
      $("lng").value = e.latlng.lng.toFixed(6);
      redraw(true);
    });
  }
  if (centerMarker) centerMarker.remove();
  if (circle) circle.remove();
  if (route) route.remove();
  if (line) line.remove();
  markers.forEach((x) => x.remove());
  markers = [];
  centerMarker = L.marker(ll, { draggable: true })
    .addTo(map)
    .bindTooltip("Center / antenna", { permanent: true });
  centerMarker.on("dragend", (e) => {
    $("lat").value = e.target.getLatLng().lat.toFixed(6);
    $("lng").value = e.target.getLatLng().lng.toFixed(6);
    redraw();
  });
  circle = L.circle(ll, {
    radius: m.o.radius,
    color: "#086b61",
    fillOpacity: 0.05,
  }).addTo(map);
  const lls = m.pts.map((p) => [p.lat, p.lng]);
  route = L.polyline([...lls, lls[0]], { color: "#086b61", weight: 3 }).addTo(
    map,
  );
  line = L.polyline([ll, lls[0]], { color: "#efa72f", dashArray: "6 6" }).addTo(
    map,
  );
  m.pts.forEach((p, i) => {
    if (i === 0 || i % Math.max(1, Math.round(m.o.count / 18)) === 0) {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: i === 0 ? 7 : 4,
        color: i === 0 ? "#d96c20" : "#086b61",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(i === 0 ? "Start · 1" : String(i + 1));
      markers.push(marker);
    }
  });
  if (fit) map.fitBounds(circle.getBounds(), { padding: [25, 25] });
  renderInfo(m);
}
function renderInfo(m) {
  const { o, pts } = m,
    c = 2 * Math.PI * o.radius,
    sl = Math.hypot(o.radius, o.altitude),
    e = (Math.atan2(o.altitude, o.radius) * 180) / Math.PI,
    ch = distanceBetween(pts[0], pts[1]),
    duration = c / o.speed;
  $("circ").textContent = `${fmt(c)} m`;
  $("slant").textContent = `${fmt(sl)} m`;
  $("elevation").textContent = `${fmt(e)}°`;
  $("duration").textContent = `${fmt(duration / 60)} min`;
  $("rate").textContent = `${fmt(360 / duration, 2)}°/s`;
  $("chord").textContent = `${fmt(ch)} m`;
  $("rows").innerHTML = pts
    .map(
      (p, i) =>
        `<tr><td>${i + 1}${i === 0 ? " · start" : ""}</td><td>${fmt(p.azimuth, 2)}°</td><td>${p.lat.toFixed(7)}</td><td>${p.lng.toFixed(7)}</td><td>${fmt(o.altitude)} m</td><td>${fmt(p.heading, 1)}°</td><td>${fmt(distanceBetween(p, { lat: o.lat, lng: o.lng }))} m</td><td>${fmt(i ? distanceBetween(pts[i - 1], p) : 0)} m</td><td>${fmt((i * ch) / o.speed)} s</td></tr>`,
    )
    .join("");
}
function download(content, name, type = "application/octet-stream") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
function csv(m) {
  const h =
    "number,azimuth_deg,latitude,longitude,altitude_m,heading_deg,distance_center_m,distance_previous_m,mission_time_s\n";
  return (
    h +
    m.pts
      .map((p, i) =>
        [
          i + 1,
          p.azimuth.toFixed(4),
          p.lat.toFixed(8),
          p.lng.toFixed(8),
          m.o.altitude,
          p.heading.toFixed(2),
          distanceBetween(p, { lat: m.o.lat, lng: m.o.lng }).toFixed(3),
          (i ? distanceBetween(m.pts[i - 1], p) : 0).toFixed(3),
          ((i * distanceBetween(m.pts[0], m.pts[1])) / m.o.speed).toFixed(2),
        ].join(","),
      )
      .join("\n")
  );
}
async function kmz(m) {
  if (!validateXml(m.template) || !validateXml(m.waylines))
    throw Error("Generated XML is not well formed.");
  const z = new JSZip();
  z.file("template.kml", m.template);
  z.file("waylines.wpml", m.waylines);
  const blob = await z.generateAsync({ type: "blob", compression: "DEFLATE" });
  const checked = await JSZip.loadAsync(blob);
  if (!checked.file("template.kml") || !checked.file("waylines.wpml"))
    throw Error("KMZ integrity check failed.");
  download(
    blob,
    `RF_Circle_${m.o.radius}m_${m.o.altitude}m_${m.o.direction.toUpperCase()}.kmz`,
    "application/vnd.google-earth.kmz",
  );
}
document
  .querySelectorAll("input:not(#centerPaste),select")
  .forEach((e) => e.addEventListener("input", () => redraw()));
$("applyCenterPaste").onclick = applyPastedCenter;
$("centerPaste").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyPastedCenter();
  }
});
$("useCenter").onclick = () => {
  const c = map.getCenter();
  $("lat").value = c.lat.toFixed(6);
  $("lng").value = c.lng.toFixed(6);
  redraw();
};
$("zoom").onclick = () => redraw(true);
$("generate").onclick = async () => {
  const m = mission();
  if (m)
    try {
      await kmz(m);
    } catch (e) {
      $("errors").textContent = e.message;
    }
};
$("csv").onclick = () => {
  const m = mission();
  if (m) download(csv(m), "RF_circle_waypoints.csv", "text/csv");
};
$("template").onclick = () => {
  const m = mission();
  if (m)
    download(
      m.template,
      "template.kml",
      "application/vnd.google-earth.kml+xml",
    );
};
$("waylines").onclick = () => {
  const m = mission();
  if (m) download(m.waylines, "waylines.wpml", "application/xml");
};
$("inspect").onclick = () => {
  const m = mission();
  if (m) {
    $("xml").textContent = m.waylines;
    $("modal").showModal();
  }
};
$("close").onclick = () => $("modal").close();
document.querySelectorAll("[data-preset]").forEach(
  (b) =>
    (b.onclick = () => {
      const p = b.dataset.preset;
      if (p === "quick") {
        Object.assign($("radius"), { value: 50 });
        $("altitude").value = 30;
        $("count").value = 36;
        $("speed").value = 3;
      } else {
        $("radius").value = 200;
        $("altitude").value = 100;
        $("speed").value = 5;
        $("count").value = p === "2" ? 180 : 72;
        $("headingMode").value = "fixed";
        $("heading").value = 0;
        $("direction").value = "cw";
      }
      redraw(true);
    }),
);
$("reference").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const z = await JSZip.loadAsync(f);
    const names = Object.keys(z.files);
    const t = z.file("template.kml"),
      w = z.file("waylines.wpml");
    const tx = t ? await t.async("text") : "",
      wx = w ? await w.async("text") : "";
    const pick = (x, s) =>
      (x.match(new RegExp(`<wpml:${s}>([^<]+)`)) || [])[1] || "not found";
    $("referenceOut").textContent =
      `Files:\n${names.join("\n")}\n\nTemplate WPML ${pick(tx, "templateType")} | heightMode ${pick(tx, "heightMode")}\nWaylines executeHeightMode ${pick(wx, "executeHeightMode")}\nAircraft ${pick(wx, "droneEnumValue")}/${pick(wx, "droneSubEnumValue")} | payload ${pick(wx, "payloadEnumValue")}\nHeading mode ${pick(wx, "waypointHeadingMode")}\nTurn mode ${pick(wx, "waypointTurnMode")}`;
  } catch (err) {
    $("referenceOut").textContent = "Could not read KMZ: " + err.message;
  }
};
redraw(true);
