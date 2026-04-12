"use client";

import { useState, memo } from 'react';
import { Smartphone } from 'lucide-react';

interface PaymentAppLinkProps {
  url: any;
  index: number;
}

const PaymentAppLink = memo(({ url, index }: PaymentAppLinkProps) => {
  const [logoError, setLogoError] = useState(false);
  
  return (
    <a
      href={url.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all"
    >
      {url.logo?.trim() && !logoError ? (
        <img 
          src={url.logo.trim()} 
          alt={url.name || url.description || 'Payment app'}
          className="w-12 h-12 object-contain rounded-lg"
          onError={() => setLogoError(true)}
        />
      ) : (
        <Smartphone className="w-8 h-8 text-gray-400" />
      )}
      <span className="text-xs text-center text-gray-700 font-medium leading-tight">
        {url.name || url.description || 'App'}
      </span>
    </a>
  );
});

PaymentAppLink.displayName = 'PaymentAppLink';

export default PaymentAppLink;

