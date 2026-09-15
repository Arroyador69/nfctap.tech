#!/usr/bin/env node
/**
 * Crea en Polar los 4 productos one-time (20 / 35 / 30 / 55 €).
 * El pack de dos NO es un cupón: es otro producto.
 *
 *   cd web && npm run polar:setup
 *
 * Lee POLAR_ACCESS_TOKEN de web/.env.local si no está en el entorno.
 */

import { readFileSync, writeFileSync } from "node:fs";

const envPath = new URL("../.env.local", import.meta.url);

loadDotEnv(envPath);

const BASE =
  process.env.POLAR_SERVER === "sandbox"
    ? "https://sandbox-api.polar.sh/v1"
    : "https://api.polar.sh/v1";

const PRODUCTS = [
  {
    env: "POLAR_PRODUCT_GENERIC_1",
    sku: "GENERIC_1",
    name: "NFCTap × 1",
    euros: 20,
    description:
      "Un atril NFC: Google, WhatsApp o Instagram. Lo programamos al enlace que indiques. Impreso en España. Precio con IVA. En el pago se suma el envío según zona.",
  },
  {
    env: "POLAR_PRODUCT_GENERIC_2",
    sku: "GENERIC_2",
    name: "NFCTap × 2",
    euros: 35,
    description:
      "Pack de dos atriles NFC (Google, WhatsApp o Instagram, o una de cada): 35 € (no 40 €). Impreso en España. Precio con IVA. En el pago se suma el envío según zona.",
  },
  {
    env: "POLAR_PRODUCT_CUSTOM_1",
    sku: "CUSTOM_1",
    name: "NFCTap personalizada × 1",
    euros: 30,
    description:
      "Un atril NFC con tu logo, TAP y estrellas. Impreso en España. Precio con IVA. En el pago se suma el envío según zona.",
  },
  {
    env: "POLAR_PRODUCT_CUSTOM_2",
    sku: "CUSTOM_2",
    name: "NFCTap personalizada × 2",
    euros: 55,
    description:
      "Pack de dos personalizadas: 55 € (no 60 €). Impreso en España. Precio con IVA. En el pago se suma el envío según zona.",
  },
];

function loadDotEnv(url) {
  let text = "";
  try {
    text = readFileSync(url, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function polar(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Polar-Version": "2026-10",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = typeof json?.detail === "string" ? json.detail : JSON.stringify(json).slice(0, 800);
    throw new Error(`${method} ${path} → ${res.status} ${msg}`);
  }
  return json;
}

async function listAll() {
  const out = [];
  let page = 1;
  for (;;) {
    const data = await polar(`/products/?limit=100&page=${page}`);
    const items = data.items || data;
    if (!Array.isArray(items) || items.length === 0) break;
    out.push(...items);
    if (items.length < 100) break;
    page += 1;
  }
  return out;
}

function matchExisting(list, spec) {
  return list.find((p) => {
    if (p.is_archived) return false;
    const sku = p.metadata?.sku;
    if (sku && sku === spec.sku) return true;
    return p.name === spec.name;
  });
}

function catalogAmount(product) {
  const prices = Array.isArray(product?.prices) ? product.prices : [];
  const fixed = prices.find((p) => p.amount_type === "fixed" && !p.is_archived) || prices[0];
  return typeof fixed?.price_amount === "number" ? fixed.price_amount : null;
}

async function createProduct(spec) {
  return polar("/products/", {
    method: "POST",
    body: {
      name: spec.name,
      description: spec.description,
      recurring_interval: null,
      recurring_interval_count: null,
      visibility: "public",
      metadata: { sku: spec.sku },
      prices: [
        {
          amount_type: "fixed",
          price_amount: spec.euros * 100,
          price_currency: "eur",
          tax_behavior: "inclusive",
        },
      ],
    },
  });
}

async function main() {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    console.error(
      "Falta POLAR_ACCESS_TOKEN.\nEn Polar: Settings → Organization Access Token (products:write, checkouts:write, checkouts:read).\nPégalo en web/.env.local y vuelve a ejecutar:\n  npm run polar:setup",
    );
    process.exit(1);
  }

  console.log(`Polar ${process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "producción"}`);
  const existing = await listAll();
  const ids = {};

  for (const spec of PRODUCTS) {
    let product = matchExisting(existing, spec);
    if (product) {
      const cents = catalogAmount(product);
      const note =
        cents != null && cents !== spec.euros * 100
          ? `  ⚠ catálogo ${cents / 100} € ≠ ${spec.euros} €`
          : "";
      console.log(`ya existe  ${spec.env}  ${product.id}  (${product.name})${note}`);
    } else {
      product = await createProduct(spec);
      console.log(`creado     ${spec.env}  ${product.id}  (${product.name})`);
    }
    ids[spec.env] = product.id;
  }

  console.log("\nPega esto en Vercel → Environment Variables y en web/.env.local:\n");
  console.log(`POLAR_SERVER=${process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production"}`);
  for (const spec of PRODUCTS) {
    console.log(`${spec.env}=${ids[spec.env]}`);
  }

  let env = "";
  try {
    env = readFileSync(envPath, "utf8");
  } catch {
    env = "";
  }
  for (const spec of PRODUCTS) {
    const line = `${spec.env}=${ids[spec.env]}`;
    const re = new RegExp(`^${spec.env}=.*$`, "m");
    env = re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`;
  }
  if (!/^POLAR_SERVER=/m.test(env)) {
    env += `POLAR_SERVER=${process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production"}\n`;
  }
  writeFileSync(envPath, env.startsWith("\n") ? env.slice(1) : env);
  console.log("\nActualizado web/.env.local (los IDs). El token no se toca si ya estaba.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
