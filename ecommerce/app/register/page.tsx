"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Бүртгүүлэх | Outdoor World';
  }, []);

  const handleClose = () => {
    router.back();
  };

  const handleSwitchToLogin = () => {
    router.push('/login');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Имэйл хаяг оруулна уу';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Имэйл хаяг буруу форматтай байна';
      }
    }

    // Phone validation (Mongolian format: 8 digits starting with 8 or 9)
    if (!formData.phone.trim()) {
      newErrors.phone = 'Утасны дугаар оруулна уу';
    } else {
      const phoneRegex = /^[89]\d{7}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Утасны дугаар 8 оронтой, 8 эсвэл 9-өөр эхлэх ёстой';
      }
    }

    // Full name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Нэр оруулна уу';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Нэр хамгийн багадаа 2 тэмдэгтээс бүрдэх ёстой';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Нууц үг оруулна уу';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Нууц үг хамгийн багадаа 6 тэмдэгтээс бүрдэх ёстой';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Нууц үгээ давтан оруулна уу';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Нууц үгүүд таарахгүй байна';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    // Limit to 8 digits
    const limited = digitsOnly.slice(0, 8);
    handleInputChange('phone', limited);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await register({
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        full_name: formData.full_name.trim()
      });
      
      // Registration successful, redirect to home or account page
      router.push('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors({ 
        submit: error.message || 'Бүртгүүлэхэд алдаа гарлаа. Дахин оролдоно уу.' 
      });
    } finally {
      setIsLoading(false);
    }
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Бүртгүүлэх</h2>
            <p className="text-gray-600">Шинэ бүртгэл үүсгэх</p>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бүтэн нэр <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 bg-gray-50 border ${
                    errors.full_name ? 'border-red-300' : 'border-gray-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Бүтэн нэрээ оруулна уу"
                  required
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имэйл хаяг <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 bg-gray-50 border ${
                    errors.email ? 'border-red-300' : 'border-gray-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="имэйл@жишээ.com"
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Утасны дугаар <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full pl-10 pr-3 py-3 bg-gray-50 border ${
                    errors.phone ? 'border-red-300' : 'border-gray-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="88123456"
                  maxLength={8}
                  required
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">8 оронтой, 8 эсвэл 9-өөр эхлэх</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Нууц үг <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 bg-gray-50 border ${
                    errors.password ? 'border-red-300' : 'border-gray-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Нууц үг давтах <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 bg-gray-50 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Нууц үгээ давтан оруулна уу"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isLoading ? 'Бүртгүүлж байна...' : 'Бүртгүүлэх'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Аль хэдийн бүртгэлтэй үү?{' '}
              <button
                onClick={handleSwitchToLogin}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Нэвтрэх
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

