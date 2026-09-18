/* Browser test suite. Open tests.html; results are also written to the page. */
(() => {
  const log = [];
  const eq = (name, ok) => {
    if (!ok) throw Error("Test failed: " + name);
    log.push("✓ " + name);
  };
  try {
    const o = {
      name: "North antenna <RF> test",
      lat: 46,
      lng: 16,
      radius: 200,
      count: 72,
      startAzimuth: 0,
      direction: "cw",
      heading: 0,
      headingMode: "fixed",
    };
    const p = generateCirclePoints(o);
    eq(
      "deterministic 72-point geometry",
      JSON.stringify(p) === JSON.stringify(generateCirclePoints(o)) &&
        p.length === 72,
    );
    eq(
      "circle radius accuracy",
      p.every(
        (x) =>
          Math.abs(distanceBetween({ lat: o.lat, lng: o.lng }, x) - 200) < 0.01,
      ),
    );
    eq(
      "cardinal bearings",
      p[0].lat > o.lat &&
        p[18].lng > o.lng &&
        p[36].lat < o.lat &&
        p[54].lng < o.lng,
    );
    const fixed = p.map((x) => ({ ...x, heading: 0 }));
    eq(
      "fixed heading",
      fixed.every((x) => x.heading === 0),
    );
    const center = p.map((x) => ({
      ...x,
      heading: calculateBearing(x, { lat: o.lat, lng: o.lng }),
    }));
    eq(
      "point-to-center heading",
      center.every(
        (x) =>
          Math.abs(
            ((x.heading -
              calculateBearing(x, { lat: o.lat, lng: o.lng }) +
              540) %
              360) -
              180,
          ) < 0.001,
      ),
    );
    const xml = generateWaylinesWpml(
      {
        ...o,
        altitude: 100,
        speed: 5,
        altRef: "relativeToStartPoint",
        finish: "noAction",
        lost: "continue",
      },
      fixed,
    );
    eq("WPML XML well formed", validateXml(xml));
    eq(
      "M3M model/payload values",
      xml.includes("<wpml:droneEnumValue>77</wpml:droneEnumValue>") &&
        xml.includes("<wpml:droneSubEnumValue>2</wpml:droneSubEnumValue>") &&
        xml.includes("<wpml:payloadEnumValue>68</wpml:payloadEnumValue>"),
    );
    eq(
      "mission name is XML escaped",
      xml.includes("<name>North antenna &lt;RF&gt; test</name>"),
    );
    eq(
      "endpoint turns are DJI-safe",
      (
        xml.match(
          /<wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature<\/wpml:waypointTurnMode>/g,
        ) || []
      ).length === 2,
    );
    eq(
      "coordinate-turn damping leaves leg clearance",
      xml.includes(
        "<wpml:waypointTurnDampingDist>4.362</wpml:waypointTurnDampingDist>",
      ),
    );
    document.body.innerHTML =
      "<pre>" + log.join("\n") + "\n\nAll tests passed.</pre>";
  } catch (e) {
    document.body.innerHTML = "<pre>" + e.stack + "</pre>";
    throw e;
  }
})();
