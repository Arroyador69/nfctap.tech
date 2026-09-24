const HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <meta name="robots" content="noindex,nofollow,noarchive"/>
  <meta name="referrer" content="no-referrer"/>
  <title>Wi‑Fi · NFCTap</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f6f1e8;
      color: #1c1915;
      padding: 28px 20px calc(28px + env(safe-area-inset-bottom));
    }
    main { max-width: 28rem; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin: .4rem 0 0; }
    p { line-height: 1.45; }
    .muted { color: #6f675c; font-size: .95rem; }
    .tiny { color: #8a8173; font-size: .75rem; }
    .gold { color: #b0892c; letter-spacing: .18em; text-transform: uppercase; font-size: .72rem; }
    .card {
      margin-top: 1rem;
      border: 1px solid #e6ddd0;
      background: #fff;
      border-radius: 24px;
      padding: 1.15rem;
    }
    .dark { background: #1c1915; color: #f6f1e7; border-color: #1c1915; }
    .dark .tiny { color: #b9ae99; }
    label { display: block; font-size: .75rem; color: #8a8173; }
    .dark label { color: #b9ae99; }
    input {
      width: 100%;
      margin-top: .35rem;
      border: 0;
      background: transparent;
      font: inherit;
      font-size: 1.45rem;
      font-weight: 700;
      color: inherit;
      padding: 0;
    }
    button {
      width: 100%;
      margin-top: 1rem;
      border: 0;
      border-radius: 999px;
      padding: .95rem;
      font: inherit;
      font-weight: 700;
      font-size: 1.05rem;
    }
    .ghost { background: #fff; border: 1px solid #1c1915; color: #1c1915; }
    .goldbtn { background: #e2b43a; color: #1c1915; }
    .flags { display: flex; gap: .5rem; flex-wrap: wrap; }
    .flags button {
      width: auto;
      padding: .55rem .9rem;
      margin: 0;
      border: 1px solid #e6ddd0;
      background: #fff;
      font-size: .9rem;
    }
    .flags button[aria-pressed="true"] { background: #1c1915; color: #f6f1e7; border-color: #1c1915; }
    #ok, #empty { display: none; }
    #ok.show, #empty.show { display: block; }
  </style>
</head>
<body>
  <main>
    <div class="flags">
      <button type="button" id="es" aria-pressed="true">Español</button>
      <button type="button" id="en" aria-pressed="false">English</button>
    </div>
    <div id="empty">
      <h1 id="emptyTitle"></h1>
      <p class="muted" id="emptyBody"></p>
    </div>
    <div id="ok">
      <p class="gold" id="tap"></p>
      <h1 id="title"></h1>
      <p class="muted" id="hint"></p>
      <section class="card">
        <label id="labNet" for="ssid"></label>
        <input id="ssid" readonly inputmode="none" autocomplete="off"/>
        <button type="button" class="ghost" id="copyNet"></button>
      </section>
      <section class="card dark">
        <label id="labPass" for="password"></label>
        <input id="password" readonly inputmode="none" autocomplete="off"/>
        <button type="button" class="goldbtn" id="copyPass"></button>
      </section>
      <p class="tiny" id="privacy" style="margin-top:1.4rem"></p>
    </div>
  </main>
  <script>
(function () {
  var COPY = {
    es: {
      tap: "TAP · Wi‑Fi",
      title: "Conectar a la red",
      hint: "Copia la contraseña. Luego Ajustes → Wi‑Fi → esa red → pégala. El iPhone no se une solo al tocar.",
      network: "Red",
      password: "Contraseña",
      openNet: "Red abierta",
      noPass: "Sin clave",
      copyNet: "Copiar nombre",
      copiedNet: "Nombre copiado",
      copyPass: "Copiar contraseña",
      copiedPass: "Contraseña copiada",
      privacy: "La clave va en el chip, no en el servidor. Sin TAP no hay datos.",
      emptyTitle: "Solo funciona con TAP",
      emptyBody: "Esta pantalla no lista redes. Solo se abre al acercar el móvil al atril."
    },
    en: {
      tap: "TAP · Wi‑Fi",
      title: "Join the network",
      hint: "Copy the password. Then Settings → Wi‑Fi → that network → paste it. iPhone does not join Wi‑Fi from NFC alone.",
      network: "Network",
      password: "Password",
      openNet: "Open network",
      noPass: "No password",
      copyNet: "Copy name",
      copiedNet: "Name copied",
      copyPass: "Copy password",
      copiedPass: "Password copied",
      privacy: "The key is on the chip, not the server. No TAP, no data.",
      emptyTitle: "TAP only",
      emptyBody: "This screen does not list networks. It only opens when you hold the phone to the stand."
    }
  };
  function b64urlDecode(raw) {
    var pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
    var b64 = raw.replace(/-/g, "+").replace(/_/g, "/") + pad;
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function authOpen(t) {
    t = String(t || "WPA").toLowerCase();
    return t === "nopass" || t === "open";
  }
  function fromParams(src) {
    var p = new URLSearchParams(src);
    var ssid = (p.get("s") || "").trim();
    if (!ssid) return null;
    return { ssid: ssid, password: p.get("p") || "", open: authOpen(p.get("t") || "WPA") };
  }
  function parse(raw) {
    raw = String(raw || "").replace(/^[#?]/, "").trim();
    if (!raw) return null;
    if (raw.indexOf("=") !== -1 && /(^|&)s=/.test(raw)) return fromParams(raw);
    try {
      var j = JSON.parse(b64urlDecode(raw));
      var ssid = String(j.s || "").trim();
      if (!ssid) return null;
      return { ssid: ssid, password: j.p || "", open: authOpen(j.t || "WPA") };
    } catch (e) {
      return null;
    }
  }
  function creds() {
    return parse(location.hash) || parse(location.search);
  }
  var lang = "es";
  try {
    var saved = localStorage.getItem("nfctap-w-lang");
    if (saved === "en" || saved === "es") lang = saved;
    else if (/^en\\b/i.test(navigator.language)) lang = "en";
  } catch (e) {}
  var data = creds();
  var t = COPY[lang];
  function paint() {
    t = COPY[lang];
    document.getElementById("es").setAttribute("aria-pressed", lang === "es" ? "true" : "false");
    document.getElementById("en").setAttribute("aria-pressed", lang === "en" ? "true" : "false");
    if (!data) {
      document.getElementById("empty").className = "show";
      document.getElementById("ok").className = "";
      document.getElementById("emptyTitle").textContent = t.emptyTitle;
      document.getElementById("emptyBody").textContent = t.emptyBody;
      return;
    }
    document.getElementById("empty").className = "";
    document.getElementById("ok").className = "show";
    document.getElementById("tap").textContent = t.tap;
    document.getElementById("title").textContent = t.title;
    document.getElementById("hint").textContent = t.hint;
    document.getElementById("labNet").textContent = t.network;
    document.getElementById("ssid").value = data.ssid;
    document.getElementById("copyNet").textContent = t.copyNet;
    document.getElementById("privacy").textContent = t.privacy;
    var open = data.open || !data.password;
    document.getElementById("labPass").textContent = open ? t.openNet : t.password;
    document.getElementById("password").value = open ? t.noPass : data.password;
    document.getElementById("copyPass").style.display = open ? "none" : "block";
    document.getElementById("copyPass").textContent = t.copyPass;
  }
  function copyFrom(id, btn, copied) {
    var el = document.getElementById(id);
    var val = el.value;
    function ok() {
      var prev = btn.textContent;
      btn.textContent = copied;
      setTimeout(function () { btn.textContent = prev; }, 2000);
    }
    el.focus();
    el.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(ok).catch(function () {
        try { document.execCommand("copy"); ok(); } catch (e) {}
      });
    } else {
      try { document.execCommand("copy"); ok(); } catch (e) {}
    }
  }
  document.getElementById("es").onclick = function () {
    lang = "es";
    try { localStorage.setItem("nfctap-w-lang", lang); } catch (e) {}
    paint();
  };
  document.getElementById("en").onclick = function () {
    lang = "en";
    try { localStorage.setItem("nfctap-w-lang", lang); } catch (e) {}
    paint();
  };
  document.getElementById("copyNet").onclick = function () {
    copyFrom("ssid", this, t.copiedNet);
  };
  document.getElementById("copyPass").onclick = function () {
    copyFrom("password", this, t.copiedPass);
  };
  paint();
  window.addEventListener("hashchange", function () {
    data = creds();
    paint();
  });
})();
  </script>
</body>
</html>`;

export async function GET() {
  return new Response(HTML, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, private",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    },
  });
}
