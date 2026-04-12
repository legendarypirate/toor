"use client";

import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, QrCode, Wallet, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import PaymentAppLink from './PaymentAppLink';
import { getPublicApiBase } from '@/app/lib/apiBase';

interface BankAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  display_order: number;
  color_scheme: string;
  // Owning company (terguun_gereg | geregesoft)
  company?: string;
}

const colorSchemeClasses: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  purple: 'bg-purple-50 border-purple-200',
  orange: 'bg-orange-50 border-orange-200',
  red: 'bg-red-50 border-red-200',
};

interface Step2ContentProps {
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  isProcessing: boolean;
  qrCode: string;
  qrText: string;
  paymentUrls: any[];
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderNumber: string;
  total: number;
  formatPrice: (price: number) => string;
  completeOrder: () => Promise<void>;
  setStep: (step: number) => void;
  // Used to filter which bank accounts show for the chosen company
  allowedCompanyKeys?: string[];
}

const Step2Content = ({
  paymentMethod,
  setPaymentMethod,
  isProcessing,
  qrCode,
  qrText,
  paymentUrls,
  paymentStatus,
  orderNumber,
  total,
  formatPrice,
  completeOrder,
  setStep,
  allowedCompanyKeys
}: Step2ContentProps) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(true);

  const DEFAULT_COMPANY_KEY = 'terguun_gereg';
  const allowedCompanies = (allowedCompanyKeys && allowedCompanyKeys.length > 0
    ? allowedCompanyKeys
    : [DEFAULT_COMPANY_KEY]
  ).filter(Boolean);

  // Fetch bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        setLoadingBankAccounts(true);
        const response = await fetch(`${getPublicApiBase()}/bank-accounts/active`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bank accounts');
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          // Filter bank accounts by company selection (default to Terguun Gerege)
          setBankAccounts(
            result.data.filter((acc: BankAccount) => {
              const accCompany = acc.company || DEFAULT_COMPANY_KEY;
              return allowedCompanies.includes(accCompany);
            })
          );
        }
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
        // Keep empty array on error
        setBankAccounts([]);
      } finally {
        setLoadingBankAccounts(false);
      }
    };

    fetchBankAccounts();
  }, [allowedCompanies.join("|")]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Төлбөрийн арга</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Payment Method Selection */}
          <div className="mb-8">
            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <label
                htmlFor="qpay"
                className={`flex flex-col items-center justify-center rounded-lg border-2 bg-white p-4 hover:bg-gray-50 cursor-pointer transition-all ${
                  paymentMethod === 'qpay' 
                    ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900 ring-opacity-20' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <RadioGroupItem value="qpay" id="qpay" className="sr-only" />
                <QrCode className={`w-8 h-8 mb-2 ${paymentMethod === 'qpay' ? 'text-gray-900' : 'text-gray-400'}`} />
                <div className="font-medium">QPay</div>
                <div className="text-xs text-gray-500 mt-1">QR код, апп</div>
              </label>
             
              <label
                htmlFor="bank"
                className={`flex flex-col items-center justify-center rounded-lg border-2 bg-white p-4 hover:bg-gray-50 cursor-pointer transition-all ${
                  paymentMethod === 'bank' 
                    ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900 ring-opacity-20' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <RadioGroupItem value="bank" id="bank" className="sr-only" />
                <Wallet className={`w-8 h-8 mb-2 ${paymentMethod === 'bank' ? 'text-gray-900' : 'text-gray-400'}`} />
                <div className="font-medium">Банкны шилжүүлэг</div>
                <div className="text-xs text-gray-500 mt-1">Хаан, Голомт, ХХБ</div>
              </label>
            </RadioGroup>
          </div>

          {/* QPay Payment Section */}
          {paymentMethod === 'qpay' && (
            <div className="text-center py-6">
              {isProcessing ? (
                <div className="mb-6">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                  <p className="text-gray-600">Төлбөрийн мэдээлэл бэлдэж байна...</p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">Төлбөрийн дүн: <span className="font-bold text-gray-900">{formatPrice(total)}</span></p>
                    <p className="text-sm text-gray-600 mb-4">Доорх QR кодыг QPay апп-аар уншуулна уу</p>
                    {qrCode?.trim() ? (
                      <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                        <img 
                          src={qrCode.trim()} 
                          alt="QPay QR Code" 
                          className="w-48 h-48 mx-auto object-contain"
                          onError={(e) => {
                            console.error('QR image failed to load');
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="inline-block p-4 bg-gray-100 border border-gray-200 rounded-lg">
                        <div className="w-48 h-48 flex items-center justify-center">
                          <QrCode className="w-24 h-24 text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                 
                  {/* Mobile App Links */}
                  {paymentUrls.length > 0 && (
                    <div className="mb-6 md:hidden">
                      <p className="text-sm text-gray-600 mb-3">Төлбөр төлөх:</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {paymentUrls.map((url, index) => (
                          <PaymentAppLink key={index} url={url} index={index} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Status */}
                  {paymentStatus === 'paid' ? (
                    <Card className="bg-green-50 border-green-200 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <div className="text-sm text-green-800">
                            <p className="font-medium">Төлбөр амжилттай төлөгдлөө!</p>
                            <p className="text-xs mt-1">Захиалга баталгаажуулж байна...</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-blue-50 border-blue-200 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">Төлбөрийн статус автоматаар шалгаж байна...</p>
                            <p className="text-xs mt-1">Төлбөр төлсний дараа автоматаар баталгаажуулах болно.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Bank Transfer Section */}
          {paymentMethod === 'bank' && (
            <div className="py-6">
              <div className="max-w-lg mx-auto">
                {loadingBankAccounts ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                    <p className="text-gray-600">Банкны дансыг уншиж байна...</p>
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Одоогоор банкны данс байхгүй байна</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map((account) => {
                      const colorClass = colorSchemeClasses[account.color_scheme] || colorSchemeClasses.blue;
                      return (
                        <Card key={account.id} className={colorClass}>
                          <CardContent className="pt-6">
                            <h3 className="font-bold text-gray-900 mb-2">{account.bank_name}</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Дансны дугаар:</span>
                                <span className="font-mono font-bold">{account.account_number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Дансны нэр:</span>
                                <span className="font-medium">{account.account_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Гүйлгээний утга:</span>
                                <span className="font-medium">{orderNumber}</span>
                              </div>
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex flex-col gap-1">
                                  <span className="text-red-700 font-semibold">Гүйлгээний утга дээр та:</span>
                                  <span className="text-red-600 font-bold">Order Id, утасны дугаар мөн ААН нэгж бол регистрийн дугаараа бичнэ үү.</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-4 h-4" />
                Буцах
              </Button>
              
              {paymentMethod === 'bank' && (
                <Button
                  type="button"
                  onClick={completeOrder}
                  variant="default"
                >
                  Гүйлгээ хийсэн
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Step2Content;
