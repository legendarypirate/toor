"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getPublicApiBase } from "../lib/apiBase";
import { Tags, Loader2 } from "lucide-react";

export default function BrandsPage() {
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Брэндүүд | TOOR.MN";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const base = getPublicApiBase();
        const collected = new Set<string>();
        let page = 1;
        const limit = 80;
        const maxPages = 15;

        while (page <= maxPages && !cancelled) {
          const r = await fetch(`${base}/products?page=${page}&limit=${limit}`);
          if (!r.ok) break;
          const data = await r.json();
          const list = data.products || [];
          for (const p of list as { brand?: string }[]) {
            const b = p.brand?.trim();
            if (b) collected.add(b);
          }
          const totalPages = data.totalPages ?? 1;
          if (page >= totalPages || list.length === 0) break;
          page += 1;
        }

        if (!cancelled) {
          setBrands(Array.from(collected).sort((a, b) => a.localeCompare(b, "mn")));
        }
      } catch {
        if (!cancelled) setBrands([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto min-h-[50vh] w-full max-w-layout px-3 py-8 sm:py-10">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md">
            <Tags className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Брэндүүд</h1>
            <p className="mt-1 text-sm text-gray-600">Брэндээр шүүж бараа харах</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="text-sm">Ачаалж байна...</span>
          </div>
        ) : brands.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center text-sm text-gray-600">
            Одоогоор брэндийн мэдээлэл олдсонгүй. Дэлгүүр хуудаснаас бараа хайна уу.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {brands.map((b) => (
              <li key={b}>
                <Link
                  href={`/product?brand=${encodeURIComponent(b)}`}
                  className="block rounded-xl border border-gray-200 bg-white px-3 py-3 text-center text-sm font-medium text-gray-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow"
                >
                  {b}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
