/* DJI WPML 1.0.2. Constants below are from DJI Cloud API WPML common elements:
   M3E/M3T/M3M droneEnumValue=77, M3M subEnum=2, M3M camera payloadEnumValue=68. */
const WPML_NS = "http://www.dji.com/wpmz/1.0.2";
const xmlEscape = (s) =>
  String(s).replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
function missionConfig(o) {
  return `<wpml:missionConfig><wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode><wpml:finishAction>${o.finish}</wpml:finishAction><wpml:exitOnRCLost>${o.lost === "continue" ? "goContinue" : "executeLostAction"}</wpml:exitOnRCLost>${o.lost === "continue" ? "" : "<wpml:executeRCLostAction>hover</wpml:executeRCLostAction>"}<wpml:takeOffSecurityHeight>${Math.min(o.altitude, 120)}</wpml:takeOffSecurityHeight><wpml:globalTransitionalSpeed>${Math.min(o.speed, 15)}</wpml:globalTransitionalSpeed><wpml:droneInfo><wpml:droneEnumValue>77</wpml:droneEnumValue><wpml:droneSubEnumValue>2</wpml:droneSubEnumValue></wpml:droneInfo><wpml:payloadInfo><wpml:payloadEnumValue>68</wpml:payloadEnumValue><wpml:payloadPositionIndex>0</wpml:payloadPositionIndex></wpml:payloadInfo></wpml:missionConfig>`;
}
function signedHeading(degrees) {
  const h = normalize(degrees);
  return h > 180 ? h - 360 : h;
}
function headingParam(p, o) {
  /* DJI supports towardPOI but no away-from-POI enum; use documented custom yaw interpolation for away/fixed headings. */ const mode =
    o.headingMode === "tangent"
      ? "followWayline"
      : o.headingMode === "center"
        ? "towardPOI"
        : "smoothTransition";
  const poi = `${o.lat},${o.lng},0`;
  return `<wpml:waypointHeadingParam><wpml:waypointHeadingMode>${mode}</wpml:waypointHeadingMode>${mode === "smoothTransition" ? `<wpml:waypointHeadingAngle>${signedHeading(p.heading).toFixed(2)}</wpml:waypointHeadingAngle><wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>` : ""}${mode === "towardPOI" ? `<wpml:waypointPoiPoint>${poi}</wpml:waypointPoiPoint>` : ""}</wpml:waypointHeadingParam>`;
}
function placemark(p, o, execute = false) {
  return `<Placemark><Point><coordinates>${p.lng.toFixed(8)},${p.lat.toFixed(8)}</coordinates></Point><wpml:index>${p.index}</wpml:index>${execute ? `<wpml:executeHeight>${o.altitude}</wpml:executeHeight>` : `<wpml:ellipsoidHeight>${o.altitude}</wpml:ellipsoidHeight><wpml:height>${o.altitude}</wpml:height><wpml:useGlobalHeight>1</wpml:useGlobalHeight>`}<wpml:useGlobalHeadingParam>0</wpml:useGlobalHeadingParam>${headingParam(p, o)}<wpml:useGlobalTurnParam>0</wpml:useGlobalTurnParam><wpml:waypointTurnParam><wpml:waypointTurnMode>toPointAndPassWithContinuityCurvature</wpml:waypointTurnMode><wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist></wpml:waypointTurnParam><wpml:useStraightLine>0</wpml:useStraightLine></Placemark>`;
}
function generateTemplateKml(o, pts) {
  const now = Date.now();
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${WPML_NS}"><Document><wpml:author>DJI Mavic 3M Circle Mission</wpml:author><wpml:createTime>${now}</wpml:createTime>${missionConfig(o)}<Folder><wpml:templateType>waypoint</wpml:templateType><wpml:templateId>0</wpml:templateId><wpml:waylineCoordinateSysParam><wpml:coordinateMode>WGS84</wpml:coordinateMode><wpml:heightMode>${o.altRef}</wpml:heightMode><wpml:positioningType>GPS</wpml:positioningType></wpml:waylineCoordinateSysParam><wpml:autoFlightSpeed>${o.speed}</wpml:autoFlightSpeed><wpml:gimbalPitchMode>manual</wpml:gimbalPitchMode><wpml:globalWaypointTurnMode>toPointAndPassWithContinuityCurvature</wpml:globalWaypointTurnMode><wpml:globalUseStraightLine>0</wpml:globalUseStraightLine>${pts.map((p) => placemark(p, o)).join("")}</Folder></Document></kml>`;
}
function generateWaylinesWpml(o, pts) {
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${WPML_NS}"><Document>${missionConfig(o)}<Folder><wpml:templateId>0</wpml:templateId><wpml:waylineId>0</wpml:waylineId><wpml:autoFlightSpeed>${o.speed}</wpml:autoFlightSpeed><wpml:executeHeightMode>${o.altRef === "relativeToStartPoint" ? "relativeToStartPoint" : "WGS84"}</wpml:executeHeightMode>${pts.map((p) => placemark(p, o, true)).join("")}</Folder></Document></kml>`;
}
function validateXml(xml) {
  const x = new DOMParser().parseFromString(xml, "application/xml");
  return !x.querySelector("parsererror");
}
