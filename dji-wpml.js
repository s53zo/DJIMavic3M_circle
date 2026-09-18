/* Compatibility layout and namespace are taken from Linear-Flight-Mission1.kmz
   exported by DJI Pilot 2. Aircraft/payload values follow DJI's WPML enum docs:
   77/2 is Mavic 3M and 68 is the Mavic 3M camera. No payload subtype is emitted
   because DJI's public WPML enum table does not document one for payload 68. */
const WPML_NS = "http://www.dji.com/wpmz/1.0.6";
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
  return `<wpml:waypointHeadingParam><wpml:waypointHeadingMode>${mode}</wpml:waypointHeadingMode><wpml:waypointHeadingAngle>${signedHeading(p.heading).toFixed(2)}</wpml:waypointHeadingAngle><wpml:waypointPoiPoint>${mode === "towardPOI" ? poi : "0.000000,0.000000,0.000000"}</wpml:waypointPoiPoint><wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable><wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode><wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex></wpml:waypointHeadingParam>`;
}
function placemark(p, o, execute = false) {
  return `<Placemark><Point><coordinates>${p.lng.toFixed(8)},${p.lat.toFixed(8)}</coordinates></Point><wpml:index>${p.index}</wpml:index>${execute ? `<wpml:executeHeight>${o.altitude}</wpml:executeHeight><wpml:waypointSpeed>${o.speed}</wpml:waypointSpeed>` : `<wpml:ellipsoidHeight>${o.altitude}</wpml:ellipsoidHeight><wpml:height>${o.altitude}</wpml:height><wpml:useGlobalHeight>1</wpml:useGlobalHeight>`}${headingParam(p, o)}<wpml:waypointTurnParam><wpml:waypointTurnMode>coordinateTurn</wpml:waypointTurnMode><wpml:waypointTurnDampingDist>${Math.min(10, o.radius * Math.sin(Math.PI / o.count)).toFixed(3)}</wpml:waypointTurnDampingDist></wpml:waypointTurnParam><wpml:useStraightLine>1</wpml:useStraightLine><wpml:waypointGimbalHeadingParam><wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle><wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle></wpml:waypointGimbalHeadingParam><wpml:isRisky>0</wpml:isRisky><wpml:waypointWorkType>0</wpml:waypointWorkType></Placemark>`;
}
function generateTemplateKml(o, pts) {
  const now = Date.now();
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${WPML_NS}"><Document><name>${xmlEscape(o.name)}</name><wpml:author>DJI Mavic 3M Circle Mission</wpml:author><wpml:createTime>${now}</wpml:createTime>${missionConfig(o)}<Folder><wpml:templateType>waypoint</wpml:templateType><wpml:templateId>0</wpml:templateId><wpml:waylineCoordinateSysParam><wpml:coordinateMode>WGS84</wpml:coordinateMode><wpml:heightMode>${o.altRef}</wpml:heightMode><wpml:positioningType>GPS</wpml:positioningType></wpml:waylineCoordinateSysParam><wpml:autoFlightSpeed>${o.speed}</wpml:autoFlightSpeed><wpml:gimbalPitchMode>manual</wpml:gimbalPitchMode><wpml:globalWaypointTurnMode>toPointAndPassWithContinuityCurvature</wpml:globalWaypointTurnMode><wpml:globalUseStraightLine>0</wpml:globalUseStraightLine>${pts.map((p) => placemark(p, o)).join("")}</Folder></Document></kml>`;
}
function generateWaylinesWpml(o, pts) {
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${WPML_NS}"><Document><name>${xmlEscape(o.name)}</name>${missionConfig(o)}<Folder><wpml:templateId>0</wpml:templateId><wpml:waylineId>0</wpml:waylineId><wpml:autoFlightSpeed>${o.speed}</wpml:autoFlightSpeed><wpml:executeHeightMode>${o.altRef === "relativeToStartPoint" ? "relativeToStartPoint" : "WGS84"}</wpml:executeHeightMode>${pts.map((p) => placemark(p, o, true)).join("")}</Folder></Document></kml>`;
}
function validateXml(xml) {
  const x = new DOMParser().parseFromString(xml, "application/xml");
  return !x.querySelector("parsererror");
}
