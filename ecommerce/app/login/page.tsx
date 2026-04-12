"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, Eye, EyeOff, User, Facebook, Chrome } from 'lucide-react';
import { showAppMessage } from '@/app/lib/appMessage';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'Нэвтрэх | Outdoor World';
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    router.back();
  };

  const handleSwitchToRegister = () => {
    router.push('/register');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // Check if input is email or phone number
      const credentials: any = { password };
      
      // Check if input looks like email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        credentials.email = email;
      } else {
        // Assume it's a phone number (Mongolian format)
        credentials.phone = email;
      }
      
      await login(credentials);
      showAppMessage('амжилттай нэвтэрлээ', 'success');
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (error: any) {
      setError(error.message || 'Нэвтрэхэд алдаа гарлаа. Та имэйл/утас болон нууц үгээ шалгана уу.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Google OAuth implementation
    window.location.href = '/api/auth/google';
  };

  const handleFacebookLogin = () => {
    // Facebook OAuth implementation
    window.location.href = '/api/auth/facebook';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

          {/* Decorative Top Bar */}
          <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500" />

          {/* Content */}
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Нэвтрэх</h2>
              <p className="text-gray-600">Тавтай морилно уу</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-8">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <Chrome className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-gray-700 font-medium group-hover:text-gray-900">
                  Google  хаягаар нэвтрэх
                </span>
              </button>

              <button
                onClick={handleFacebookLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1877F2] text-white rounded-xl hover:bg-[#166fe5] transition-all duration-200 group"
              >
                <Facebook className="w-5 h-5" />
                <span className="font-medium group-hover:text-white/90">
                  Facebook хаягаар нэвтрэх
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Эсвэл</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имэйл хаяг эсвэл Утасны дугаар
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="имэйл@жишээ.com эсвэл 88123456"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Нууц үг
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Нууц үгээ оруулна уу"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800"
                    onClick={() => {/* Forgot password logic */}}
                  >
                    Нууц үгээ мартсан уу?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {isLoading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Шинэ хэрэглэгч үү?{' '}
                <button
                  onClick={handleSwitchToRegister}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Бүртгүүлэх
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}