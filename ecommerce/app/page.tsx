// app/page.tsx - Updated version
"use client";

import { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedProducts from './components/FeaturedProducts';
import Footer from './components/Footer';
import DemandedProducts from './components/DemandedProducts';
import Partners from './components/Partners';

export default function Home() {
  useEffect(() => {
    document.title = 'Нүүр хуудас | Outdoor World';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <Header />
      <Hero />
      <FeaturedProducts />
      <DemandedProducts />
      <Partners />
      <Footer />
    </div>
  );
}