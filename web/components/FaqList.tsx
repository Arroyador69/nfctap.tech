import type { FaqItem } from "@/lib/seo";

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <dl className="grid gap-3">
      {items.map((item) => (
        <div key={item.q} className="rounded-[22px] border border-[#e6ddd0] bg-white px-5 py-4">
          <dt className="font-semibold text-[#1c1915]">{item.q}</dt>
          <dd className="mt-2 text-sm leading-6 text-[#5c564c]">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}
