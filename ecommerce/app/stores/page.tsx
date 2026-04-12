"use client";

import { useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Store } from "lucide-react";

export default function StoresPage() {
  useEffect(() => {
    document.title = "Дэлгүүрүүд | Outdoor World";
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto min-h-[50vh] w-full max-w-layout px-3 py-10 sm:py-14">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg">
            <Store className="h-7 w-7" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Дэлгүүрүүд</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base">
            Олон дэлгүүр, салбаруудын мэдээллийг удахгүй эндээс үзэх боломжтой болно.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
