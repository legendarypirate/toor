"use client";

import { NextPage } from 'next';
import Head from 'next/head';
import Header from '../components/Header';
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import FeaturedProducts from '../components/FeaturedProducts';
import Footer from '../components/Footer';
import { getStaticProducts, getStaticCategories } from '../lib/staticData';
import { Product, Category } from '../lib/types';

interface HomeProps {
  products: Product[];
  categories: Category[];
}

const Home: NextPage<HomeProps> = ({ products, categories }) => {
  const featuredProducts = products.filter(product => product.isFeatured);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>mongolia</title>
        <meta name="description" content="Монголын хамгийн анхны онлайн дэлгүүр" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/toor_logo.png" />
      </Head>

      <Header />
      <Hero />
      <CategoryGrid categories={categories} />
      <FeaturedProducts products={featuredProducts} />
      <Footer />
    </div>
  );
};

export async function getStaticProps() {
  const products = getStaticProducts();
  const categories = getStaticCategories();

  return {
    props: {
      products,
      categories
    },
    revalidate: 3600
  };
}

export default Home;