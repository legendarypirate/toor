"use client";

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

interface Step3ContentProps {
  orderNumber: string;
  subtotal: number;
  shipping: number;
  couponDiscount: number;
  total: number;
  formData: any;
  paymentMethod: string;
  isAuthenticated: boolean;
  formatPrice: (price: number) => string;
}

const Step3Content = ({
  orderNumber,
  subtotal,
  shipping,
  couponDiscount,
  total,
  formData,
  paymentMethod,
  isAuthenticated,
  formatPrice
}: Step3ContentProps) => {
  const router = useRouter();

  const handleLoginRedirect = useCallback(() => {
    router.push('/?login_required=true&redirect=/checkout');
  }, [router]);

  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Баяр хүргэе!</h1>
        <p className="text-gray-600 mb-8">
          Таны захиалга амжилттай хүлээн авлаа. Захиалгын дугаар: <strong>{orderNumber}</strong>
        </p>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Захиалгын дэлгэрэнгүй</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-600">Захиалгын дугаар:</span>
                <span className="font-medium">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Барааны үнэ:</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              {shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Хүргэлтийн төлбөр:</span>
                  <span className="font-medium">{formatPrice(shipping)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-gray-600">Урамшуулал:</span>
                  <span className="font-medium">-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="text-gray-600 font-bold">Нийт дүн:</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Хүргэлтийн хаяг:</span>
                <span className="font-medium text-right">
                  {(() => {
                    const addressParts = [
                      formData.city,
                      formData.district && `Дүүрэг: ${formData.district}`,
                      formData.khoroo && `Хороо: ${formData.khoroo}`,
                      formData.address
                    ].filter(Boolean);
                    return addressParts.length > 0 ? addressParts.join(', ') : 'Хаяг оруулаагүй';
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Утасны дугаар:</span>
                <span className="font-medium">{formData.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Төлбөрийн арга:</span>
                <span className="font-medium">
                  {paymentMethod === 'qpay' ? 'Нэхэжмлэх' : 
                   paymentMethod === 'card' ? 'Карт' : 'Банкны шилжүүлэг'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Хүргэлтийн арга:</span>
                <span className="font-medium">Хүргэлтээр</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="default">
            <Link href="/product">
              Үргэлжлүүлэх дэлгүүр
            </Link>
          </Button>
          {isAuthenticated ? (
            <Button asChild variant="outline">
              <Link href="/orders">
                Миний захиалгууд
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleLoginRedirect}
              variant="outline"
            >
              Бүртгүүлэх
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step3Content;
