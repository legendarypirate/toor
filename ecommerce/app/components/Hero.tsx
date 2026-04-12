"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getPublicApiBase } from '../lib/apiBase';
import { BRAND_NAME } from '../lib/brand';
import { safeImgSrc } from '../lib/imageSrc';

interface Banner {
  id: string | number;
  image: string;
  text?: string;
  link?: string;
  order?: number;
}

/** Outdoor-style hero imagery (Unsplash) when API has no banners */
const OUTDOOR_HERO_DEFAULTS: Banner[] = [
  {
    id: 'outdoor-1',
    image:
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=2400&q=85',
    text: 'Камп, майхан, аялал',
  },
  {
    id: 'outdoor-2',
    image:
      'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=2400&q=85',
    text: 'Уул, зам, outdoor хувцас',
  },
  {
    id: 'outdoor-3',
    image:
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=2400&q=85',
    text: 'Ой, байгаль, адал явдал',
  },
];

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${getPublicApiBase()}/banner/published`);

        // Handle 404 or other errors gracefully - use default banners
        if (!response.ok) {
          setSlides(OUTDOOR_HERO_DEFAULTS);
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setSlides(data);
        } else {
          setSlides(OUTDOOR_HERO_DEFAULTS);
        }
      } catch (error) {
        console.error('Error fetching banners:', error);
        setSlides(OUTDOOR_HERO_DEFAULTS);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  // Auto-play slider
  useEffect(() => {
    if (slides.length <= 1 || loading) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [slides.length, loading]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  if (loading) {
    return (
      <section className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] overflow-hidden">
      <div className="mx-auto w-full max-w-layout px-3 h-full">
        <div className="relative w-full h-full rounded-2xl overflow-hidden mt-3 bg-gray-200 animate-pulse" />
      </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full h-[60vh] sm:h-[70vh] lg:h-[80vh] overflow-hidden">
      <div className="relative w-full h-full">
        {slides.map((slide, index) => {
          const slideDiv = (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
            >
              <Image
                src={safeImgSrc(slide.image, OUTDOOR_HERO_DEFAULTS[0].image)}
                alt={slide.text || `${BRAND_NAME} — ${index + 1}`}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="100vw"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/25"
                aria-hidden
              />
            </div>
          );

          // Wrap in link if banner has a link
          if (slide.link) {
            return (
              <a
                key={slide.id || index}
                href={slide.link}
                className="absolute inset-0 z-0"
                target="_blank"
                rel="noopener noreferrer"
              >
                {slideDiv}
              </a>
            );
          }

          return slideDiv;
        })}

        {/* Brand overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[8] flex flex-col items-center justify-end px-4 pb-14 text-center sm:pb-16 md:pb-20">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-300/95 sm:text-xs">
            Explore · Camp · Trail
          </p>
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
            {BRAND_NAME}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">
            Ой тогтуун, аялал, outdoor хэрэгслийн таны дэлгүүр
          </p>
        </div>

        {/* Navigation Arrows - Only show if more than one slide */}
        {slides.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all duration-300"
              aria-label="Previous slide"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all duration-300"
              aria-label="Next slide"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Dots Indicator - Only show if more than one slide */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${index === currentSlide
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;