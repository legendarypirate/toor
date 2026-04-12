"use client";

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { getPublicApiBase } from '../lib/apiBase';
import { safeImgSrc } from '../lib/imageSrc';

interface Partner {
  id: string;
  name: string;
  logo: string;
  websiteUrl: string | null;
  order: number;
}

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${getPublicApiBase()}/partners/active`);
        
        if (!response.ok) {
          console.error('Failed to fetch partners');
          setPartners([]);
          return;
        }

        const data = await response.json();
        setPartners(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching partners:', error);
        setPartners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, []);

  if (loading) {
    return (
      <section className="w-full py-12 bg-white">
        <div className="mx-auto w-full max-w-layout px-3">
          <h2 className="text-2xl font-bold text-center mb-8">Хамтран ажиллагсад</h2>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-4">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (partners.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-12 bg-white border-t border-gray-200">
      <div className="mx-auto w-full max-w-layout px-3">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-gray-900">
          Хамтран ажиллагсад
        </h2>
        
        <div className="grid grid-cols-6 md:grid-cols-12 gap-4 md:gap-6">
          {partners.map((partner) => {
            const logoElement = (
              <div className="relative w-full aspect-square bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-all hover:shadow-md flex items-center justify-center overflow-hidden">
                <img
                  src={safeImgSrc(partner.logo)}
                  alt={partner.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/default.jpg';
                  }}
                />
              </div>
            );

            if (partner.websiteUrl) {
              return (
                <a
                  key={partner.id}
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative"
                  title={partner.name}
                >
                  {logoElement}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </div>
                </a>
              );
            }

            return (
              <div key={partner.id} title={partner.name}>
                {logoElement}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Partners;

