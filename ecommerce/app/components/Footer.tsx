'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { getPublicApiBase } from '../lib/apiBase';
import {
  BRAND_NAME,
  FOOTER_TAGLINE,
  publicBrandName,
  publicCopyrightText,
  publicContactEmail,
  publicFooterDescription,
  publicLogoUrl,
  storefrontLogoSrc,
} from '../lib/brand';

interface SocialLink {
  name: string;
  icon: string;
  url: string;
}

interface QuickLink {
  label: string;
  url: string;
}

interface FooterLink {
  label: string;
  url: string;
}

interface FooterData {
  id?: string;
  companyName: string;
  companySuffix: string;
  description: string;
  logoUrl: string;
  socialLinks: SocialLink[];
  quickLinks: QuickLink[];
  phone: string;
  email: string;
  address: string;
  copyrightText: string;
  footerLinks: FooterLink[];
}

const Footer = () => {
  const [footerData, setFooterData] = useState<FooterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFooter = async () => {
      try {
        const response = await fetch(`${getPublicApiBase()}/footer`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch footer: ${response.status} ${response.statusText}. ${errorText}`);
        }
        
        const data = await response.json();
        const legacy = /tsaas/i.test(String(data.companyName ?? ""));
        setFooterData({
          ...data,
          companyName: publicBrandName(data.companyName),
          companySuffix: legacy ? "" : (data.companySuffix ?? ""),
          description: publicFooterDescription(data.description),
          copyrightText: publicCopyrightText(data.copyrightText),
          email: publicContactEmail(data.email),
          logoUrl: publicLogoUrl(data.logoUrl),
        });
      } catch (error) {
        // Handle network errors and API errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('Network error fetching footer - API server may be down:', error);
        } else {
          console.error('Error fetching footer:', error);
        }
        
        // Set default data on error
        setFooterData({
          companyName: BRAND_NAME,
          companySuffix: "",
          description: FOOTER_TAGLINE,
          logoUrl: publicLogoUrl(null),
          socialLinks: [
            { name: "Facebook", icon: "f", url: "#" },
            { name: "Twitter", icon: "t", url: "#" },
            { name: "Instagram", icon: "i", url: "#" },
            { name: "Pinterest", icon: "p", url: "#" }
          ],
          quickLinks: [
            { label: "Нүүр", url: "/" },
            { label: "Дэлгүүр", url: "/product" },
            { label: "Ангилал", url: "/product" },
            { label: "Сагс", url: "/cart" }
          ],
          phone: "+976 7000-5060",
          email: "info@outdoorworld.mn",
          address: "Улаанбаатар хот",
          copyrightText: `© ${new Date().getFullYear()} ${BRAND_NAME}. Бүх эрх хуулиар хамгаалагдсан.`,
          footerLinks: [
            { label: "Нууцлалын бодлого", url: "#" },
            { label: "Үйлчилгээний нөхцөл", url: "#" },
            { label: "Төлбөрийн нөхцөл", url: "#" }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFooter();
  }, []);

  // Initialize chatbot when script loads
  useEffect(() => {
    const initChatbot = () => {
      if (typeof window !== 'undefined' && (window as any).ktt10) {
        (window as any).ktt10.setup({
          id: "KT6JpkeiKo4dJU",
          accountId: "1800667",
          color: "#000000"
        });
      }
    };

    // Try to initialize immediately if script is already loaded
    initChatbot();

    // Also listen for script load event
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).ktt10) {
        initChatbot();
        clearInterval(checkInterval);
      }
    }, 100);

    // Cleanup interval after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, []);

  if (loading || !footerData) {
    return (
      <footer className="bg-black text-white mt-8">
        <div className="pt-10 pb-8">
          <div className="mx-auto w-full max-w-layout px-3">
            <div className="text-center py-8">
              <p className="text-white/60">Уншиж байна...</p>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-black text-white mt-8">
      <div className="pt-10 pb-8">
        <div className="mx-auto w-full max-w-layout px-3">
          {/* Four equal columns */}
          <div className="mb-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {/* 1 — Брэнд */}
            <div className="flex flex-col">
              <div className="mb-4 flex items-center gap-3">
                <img
                  src={storefrontLogoSrc()}
                  alt={`${publicBrandName(footerData.companyName)} Logo`}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-lg object-cover"
                />
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">{publicBrandName(footerData.companyName)}</h3>
                  {footerData.companySuffix ? (
                    <p className="text-xs text-white/60">{footerData.companySuffix}</p>
                  ) : null}
                </div>
              </div>
              {footerData.description && (
                <p className="mb-4 flex-1 text-sm leading-relaxed text-white/60">{footerData.description}</p>
              )}
              {footerData.socialLinks && footerData.socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {footerData.socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.url || '#'}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
                      aria-label={social.name || 'Social'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-sm">{social.icon}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* 2 — Холбоос */}
            <div>
              <h4 className="mb-4 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white">
                Холбоос
              </h4>
              {footerData.quickLinks && footerData.quickLinks.length > 0 && (
                <ul className="space-y-2.5">
                  {footerData.quickLinks.map((link, index) => (
                    <li key={index}>
                      <a href={link.url || '#'} className="text-sm text-white/60 transition hover:text-white">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 3 — Нөхцөл, тусламж */}
            <div>
              <h4 className="mb-4 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white">
                Тусламж
              </h4>
              {footerData.footerLinks && footerData.footerLinks.length > 0 && (
                <ul className="space-y-2.5">
                  {footerData.footerLinks.map((link, index) => (
                    <li key={index}>
                      <a href={link.url || '#'} className="text-sm text-white/60 transition hover:text-white">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 4 — Холбоо барих */}
            <div>
              <h4 className="mb-4 border-b border-white/10 pb-2 text-sm font-bold uppercase tracking-wide text-white">
                Холбоо барих
              </h4>
              <ul className="space-y-3">
                {footerData.phone && (
                  <li>
                    <div className="text-xs text-white/50">Утас</div>
                    <div className="text-sm text-white">{footerData.phone}</div>
                  </li>
                )}
                {footerData.email && (
                  <li>
                    <div className="text-xs text-white/50">Имэйл</div>
                    <a href={`mailto:${publicContactEmail(footerData.email)}`} className="text-sm text-white/90 hover:text-white">
                      {publicContactEmail(footerData.email)}
                    </a>
                  </li>
                )}
                {footerData.address && (
                  <li>
                    <div className="text-xs text-white/50">Хаяг</div>
                    <div className="text-sm text-white/80">{footerData.address}</div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Single bottom line — copyright only */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-layout px-3 py-4">
          <p className="text-center text-xs text-white/50">
            {publicCopyrightText(footerData.copyrightText)}
          </p>
        </div>
      </div>
      
     
    </footer>
  );
};

export default Footer;