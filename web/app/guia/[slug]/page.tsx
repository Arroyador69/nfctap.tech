import { FaqList } from "@/components/FaqList";
import { GuideBuy } from "@/components/GuideBuy";
import { JsonLd } from "@/components/JsonLd";
import { PRICE } from "@/lib/catalog";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { articleJsonLd, pageMeta, productJsonLd } from "@/lib/seo";
import { getShipping } from "@/lib/store";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};
  return pageMeta({
    title: guide.title,
    description: guide.description,
    path: `/guia/${guide.slug}`,
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();
  const shipping = await getShipping();
  const price = guide.product.kind === "wifi" ? PRICE.wifi.first : PRICE.generica.first;

  return (
    <>
    <article className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <JsonLd
        data={articleJsonLd({
          title: guide.title,
          description: guide.description,
          path: `/guia/${guide.slug}`,
          datePublished: guide.datePublished,
          faq: guide.faq,
        })}
      />
      <JsonLd
        data={productJsonLd({
          name: guide.product.kind === "wifi" ? "TAP Wi‑Fi de pared" : guide.title,
          description: guide.description,
          price,
          path: `/guia/${guide.slug}`,
        })}
      />
      <p className="text-xs uppercase tracking-[0.2em] text-[#b0892c]">{guide.kicker}</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.75rem] leading-tight sm:text-4xl">
        {guide.title}
      </h1>
      <p className="mt-4 text-lg leading-7 text-[#3f3a34]">{guide.answer}</p>
      {guide.sections.map((s) => (
        <section key={s.h2} className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#1c1915]">{s.h2}</h2>
          {s.body.map((p, i) => (
            <p key={`${s.h2}-${i}`} className="mt-3 text-[15px] leading-7 text-[#5c564c]">
              {p}
            </p>
          ))}
        </section>
      ))}
      <div className="mt-10">
        <FaqList items={guide.faq} />
      </div>
      <p className="mt-8 text-sm">
        <Link href="/guia" className="text-[#7a7266] underline">
          Más guías NFCTap
        </Link>
      </p>
    </article>
    <div className="mx-auto max-w-6xl px-5 pb-16">
      <GuideBuy guide={guide} shipping={shipping} />
    </div>
    </>
  );
}
