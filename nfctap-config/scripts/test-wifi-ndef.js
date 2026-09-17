#!/usr/bin/env node
"use strict";

const Ndef = require("../node_modules/react-native-nfc-manager/ndef-lib");

function landingUrl(ssid, password) {
  const raw = JSON.stringify({ s: ssid, p: password, t: "WPA" });
  const b64 = Buffer.from(raw, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://nfctap.tech/w#${b64}`;
}

function parseLanding(url) {
  const u = new URL(url);
  const raw = u.hash.replace(/^#/, "");
  const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
  const json = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8");
  const j = JSON.parse(json);
  return { ssid: j.s, password: j.p };
}

const ssid = "CASA_ALBERTO";
const password = "clave-de-prueba-99";
const uri = landingUrl(ssid, password);

let failed = 0;
function ok(name, cond, extra) {
  if (cond) console.log("OK  " + name);
  else {
    failed += 1;
    console.log("FAIL " + name + (extra ? " · " + extra : ""));
  }
}

// El crash de TestFlight: Uint8Array no es Array → stringToBytes → charCodeAt
let threw = false;
try {
  Ndef.encodeMessage([
    Ndef.uriRecord(uri),
    Ndef.mimeMediaRecord("application/vnd.wfa.wsc", Uint8Array.from([0x10, 0x0e, 0x00, 0x04, 1, 2, 3, 4])),
  ]);
} catch (e) {
  threw = /undefined is not a function|charCodeAt/i.test(String(e && e.message));
}
ok("Uint8Array revienta (el bug de TestFlight)", threw, threw ? "" : "no lanzó el error esperado");

const uriRec = Ndef.uriRecord(uri);
const wifiRec = Ndef.wifiSimpleRecord({ ssid, networkKey: password });
ok("wifiSimpleRecord es Array de bytes", Array.isArray(wifiRec.payload));
ok("wifiSimpleRecord no es Uint8Array", !(wifiRec.payload instanceof Uint8Array));

const encoded = Ndef.encodeMessage([uriRec, wifiRec]);
ok("encode URI + Wi-Fi", Array.isArray(encoded) && encoded.length > 20, "len=" + (encoded && encoded.length));

const decoded = Ndef.decodeMessage(encoded);
ok("2 registros", decoded.length === 2, "n=" + decoded.length);

const gotUri = Ndef.uri.decodePayload(decoded[0].payload);
const parsed = parseLanding(gotUri);
ok("URI conserva SSID", parsed.ssid === ssid, parsed.ssid);
ok("URI conserva contraseña", parsed.password === password, parsed.password);
ok("URI no lleva la clave en claro", !uri.includes(password));
ok("URI no usa ?query (iría a logs)", !uri.includes("?"));

const wsc = Ndef.wifiSimple.decodePayload(decoded[1].payload);
ok("WSC SSID", wsc.ssid === ssid, wsc.ssid);
ok("WSC clave", wsc.networkKey === password, wsc.networkKey);

if (failed) {
  console.error("\n" + failed + " pruebas fallaron");
  process.exit(1);
}
console.log("\nNDEF Wi-Fi listo para grabar.");
