import { DashboardNav } from "@/components/DashboardNav";
import { isAdmin } from "@/lib/auth";
import { openaiConfigured } from "@/lib/openai";
import { GUIDES } from "@/lib/guides";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SeoDraftForm } from "./draft-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO" };

const INDEX_URLS = [
  { href: "/", label: "Inicio" },
  { href: "/guia", label: "Índice de la guía" },
  ...GUIDES.map((g) => ({ href: `/guia/${g.slug}`, label: g.title })),
  { href: "/wifi", label: "TAP Wi‑Fi de pared" },
  { href: "/personalizar", label: "Encargar" },
  { href: "/llms.txt", label: "llms.txt (para chats de IA)" },
];

export default async function SeoPage() {
  if (!(await isAdmin())) redirect("/dashboard/login");
  const ready = openaiConfigured();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <DashboardNav />
      <h1 className="font-[family-name:var(--font-display)] text-3xl">SEO y chats de IA</h1>
      <p className="mt-2 max-w-xl text-sm text-[#5c564c]">
        SEO técnico es el cableado: Google entra, entiende el producto y no se pierde. Eso
        ya está en el código. Tú no tocas código. Tú avisas a Google y a Bing de que las
        páginas nuevas existen, y dejas que un dueño de bar te encuentre por lo que busca
        (reseñas, WhatsApp, Wi‑Fi), no solo por «NFCTap».
      </p>

      <section className="mt-8 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">Ya está hecho (no lo repetimos)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#5c564c]">
          <li>Cada página tiene un título, una descripción y una URL canónica.</li>
          <li>
            El mapa del sitio (<code>sitemap.xml</code>) lista inicio, encargar, Wi‑Fi y las
            4 guías. Carrito y dashboard no se indexan.
          </li>
          <li>
            Datos estructurados (JSON-LD): quiénes somos, productos, preguntas, artículos.
          </li>
          <li>
            <code>/llms.txt</code> resume el negocio para ChatGPT, Gemini y similares.
          </li>
          <li>robots.txt deja pasar a Google y a los bots de OpenAI, Claude y Perplexity.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-[#1c1915] bg-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#b0892c]">Lo que haces tú</p>
        <h2 className="mt-1 font-semibold">1. Publicar (si aún no está en nfctap.tech)</h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          Search Console solo ve lo desplegado. Si las guías no abren en{" "}
          <a className="underline" href="https://nfctap.tech/guia">
            nfctap.tech/guia
          </a>
          , primero hay que subir el código (commit + Vercel). Luego los pasos de abajo.
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">2. Google Search Console (clientes en Google)</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-[#5c564c]">
          <li>
            Abre{" "}
            <a
              className="underline decoration-[#d9cfc0] underline-offset-2"
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noreferrer"
            >
              Search Console
            </a>{" "}
            con la cuenta que verificó nfctap.tech.
          </li>
          <li>
            Menú izquierdo → <strong>Sitemaps</strong> → pega{" "}
            <code className="break-all">https://nfctap.tech/sitemap.xml</code> → Enviar.
            Si ya estaba, pulsa el que hay y «Volver a enviar». En unos días debe decir
            «Correcto» y un número de URLs descubiertas (unas 9, no 1).
          </li>
          <li>
            Arriba, la barra <strong>Inspeccionar URL</strong>. Pega cada enlace de la lista
            de abajo. Si sale «La URL no está en Google» → <strong>Solicitar indexación</strong>.
            Máximo unas cuantas al día; con las 4 guías + inicio + Wi‑Fi basta.
          </li>
          <li>
            Durante 2–4 semanas no esperes tráfico. Luego: Rendimiento → consultas. Ahí
            verás si alguien buscó «atril nfc», «reseñas google barra», etc.
          </li>
        </ol>
      </section>

      <section className="mt-6 rounded-3xl border border-[#fff4d6] bg-[#fffaf0] p-5">
        <h2 className="font-semibold">Si Search Console dice «Página con redirección»</h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          <code>http://nfctap.tech</code> → https es normal. El problema es que{" "}
          <code>https://nfctap.tech</code> ahora salta a <code>www.nfctap.tech</code>.
          Google no indexa el origen, indexa www. El sitemap y las bios usan sin www.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[#5c564c]">
          <li>Vercel → el proyecto nfctap.tech → Settings → Domains.</li>
          <li>
            <strong>nfctap.tech</strong> = dominio de producción (el que abre la web, sin
            www).
          </li>
          <li>
            <strong>www.nfctap.tech</strong> → Redirect to <strong>nfctap.tech</strong> (al
            revés de ahora).
          </li>
          <li>
            En Search Console, Inspeccionar <code>https://nfctap.tech/</code>: debe decir
            200, no redirección. Entonces «Validar corrección». Hasta entonces no pulses
            Validar.
          </li>
        </ol>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">3. Bing (ChatGPT y Copilot)</h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          ChatGPT no lee Search Console. Lee Bing. Sin Bing, un chat casi no te cita.
        </p>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-[#5c564c]">
          <li>
            Entra en{" "}
            <a
              className="underline decoration-[#d9cfc0] underline-offset-2"
              href="https://www.bing.com/webmasters"
              target="_blank"
              rel="noreferrer"
            >
              Bing Webmaster
            </a>{" "}
            con una cuenta Microsoft (Hotmail/Outlook vale).
          </li>
          <li>
            Añadir sitio → <strong>Importar desde Google Search Console</strong>. Eliges
            nfctap.tech. No hace falta otro TXT en Porkbun.
          </li>
          <li>
            Sitemaps → envía el mismo <code>https://nfctap.tech/sitemap.xml</code>.
          </li>
        </ol>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">4. Enlaces que Google debe ver</h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          Ábrelos en el móvil. Si cargan, pídeles indexación en Search Console.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {INDEX_URLS.map((u) => (
            <li key={u.href}>
              <Link className="underline decoration-[#d9cfc0] underline-offset-2" href={u.href}>
                {u.label}
              </Link>
              <span className="ml-2 font-mono text-[11px] text-[#8a8173]">
                nfctap.tech{u.href === "/" ? "" : u.href}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">5. Los 2 vídeos al día (no un artículo por vídeo)</h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          Un Reel no es una página nueva. Las 4 redes empujan a la misma guía. El
          producto (encargar) ya está en esa página. Publicar 2 posts de IA al día
          hace daño.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#5c564c]">
          <li>
            Reseñas / Maps →{" "}
            <code className="break-all">/guia/atril-nfc-resenas-google</code>
          </li>
          <li>
            QR sucio o papel → <code className="break-all">/guia/nfc-o-qr-hosteleria</code>
          </li>
          <li>
            WhatsApp, Instagram o logo →{" "}
            <code className="break-all">/guia/atril-nfc-whatsapp-instagram</code>
          </li>
          <li>
            Wi‑Fi pared → <code className="break-all">/guia/wifi-nfc-alquiler-hotel</code>
          </li>
        </ul>
        <p className="mt-3 text-sm text-[#5c564c]">
          El pack del día ya pega esa URL en CAPTION_REEL_*.txt y en COMO_PUBLICAR.txt.
          En YouTube, esa URL en la descripción (arriba).
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">6. Bios y prueba real</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#5c564c]">
          <li>
            Instagram, TikTok, YouTube y Facebook: bio{" "}
            <strong>https://nfctap.tech</strong> (no solo Linktree).
          </li>
          <li>
            OpenAI en este panel es borrador. Nunca «publicar automático».
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e6ddd0] bg-[#faf6ee] p-5">
        <h2 className="font-semibold">No hagas esto</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#5c564c]">
          <li>Comprar «posición 1 en Google» ni granjas de enlaces.</li>
          <li>Páginas de «atril NFC Madrid / Málaga / Valencia» clonadas.</li>
          <li>Publicar el borrador de OpenAI sin editarlo.</li>
          <li>Poner una dirección inventada para salir en Maps. Si no hay local público, no hay ficha local.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-[#e6ddd0] bg-white p-5">
        <h2 className="font-semibold">Borrador con OpenAI (opcional)</h2>
        <p className="mt-2 text-sm text-[#5c564c]">
          Misma clave que Delfín Check-in. En Vercel → Project nfctap → Settings →
          Environment Variables → <code>OPENAI_API_KEY</code> → Redeploy. El texto no se
          publica: lo copias, lo retocas y me pides que lo meta en la guía.
        </p>
        {!ready && (
          <p className="mt-3 rounded-2xl bg-[#fff4d6] px-4 py-3 text-sm">
            Falta OPENAI_API_KEY. Sin ella el botón de abajo no escribe. Las 4 guías ya
            están; esto es solo para las siguientes.
          </p>
        )}
        <SeoDraftForm configured={ready} />
      </section>
    </div>
  );
}
