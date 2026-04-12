"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dgpk9aqnc';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

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

export default function FooterPage() {
  const [footer, setFooter] = useState<FooterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/footer`;

  // Get auth token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  // Fetch footer data
  const fetchFooter = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFooter(data);
    } catch (err) {
      console.error('Error fetching footer:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch footer');
    } finally {
      setLoading(false);
    }
  };

  // Save footer data
  const saveFooter = async () => {
    if (!footer) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = getAuthToken();
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(footer),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setFooter(result.footer || result);
      setSuccess('Footer мэдээлэл амжилттай хадгалагдлаа!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving footer:', err);
      setError(err instanceof Error ? err.message : 'Failed to save footer');
    } finally {
      setSaving(false);
    }
  };

  // Add social link
  const addSocialLink = () => {
    if (!footer) return;
    setFooter({
      ...footer,
      socialLinks: [...footer.socialLinks, { name: '', icon: '', url: '' }]
    });
  };

  // Remove social link
  const removeSocialLink = (index: number) => {
    if (!footer) return;
    setFooter({
      ...footer,
      socialLinks: footer.socialLinks.filter((_, i) => i !== index)
    });
  };

  // Update social link
  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    if (!footer) return;
    const updated = [...footer.socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setFooter({ ...footer, socialLinks: updated });
  };

  // Add quick link
  const addQuickLink = () => {
    if (!footer) return;
    setFooter({
      ...footer,
      quickLinks: [...footer.quickLinks, { label: '', url: '#' }]
    });
  };

  // Remove quick link
  const removeQuickLink = (index: number) => {
    if (!footer) return;
    setFooter({
      ...footer,
      quickLinks: footer.quickLinks.filter((_, i) => i !== index)
    });
  };

  // Update quick link
  const updateQuickLink = (index: number, field: keyof QuickLink, value: string) => {
    if (!footer) return;
    const updated = [...footer.quickLinks];
    updated[index] = { ...updated[index], [field]: value };
    setFooter({ ...footer, quickLinks: updated });
  };

  // Add footer link
  const addFooterLink = () => {
    if (!footer) return;
    setFooter({
      ...footer,
      footerLinks: [...footer.footerLinks, { label: '', url: '#' }]
    });
  };

  // Remove footer link
  const removeFooterLink = (index: number) => {
    if (!footer) return;
    setFooter({
      ...footer,
      footerLinks: footer.footerLinks.filter((_, i) => i !== index)
    });
  };

  // Update footer link
  const updateFooterLink = (index: number, field: keyof FooterLink, value: string) => {
    if (!footer) return;
    const updated = [...footer.footerLinks];
    updated[index] = { ...updated[index], [field]: value };
    setFooter({ ...footer, footerLinks: updated });
  };

  // Upload logo to Cloudinary
  const uploadLogoToCloudinary = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (file.type !== 'image/png') {
        reject(new Error('Зөвхөн PNG зураг оруулах боломжтой'));
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'footer');
      formData.append('tags', 'footer_logo');

      const xhr = new XMLHttpRequest();

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          reject(new Error(`Зураг оруулахад алдаа гарлаа: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Зураг оруулахад алдаа гарлаа'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    });
  };

  // Handle logo file upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'image/png') {
      setError('Зөвхөн PNG зураг оруулах боломжтой');
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);
      const cloudinaryUrl = await uploadLogoToCloudinary(file);
      setFooter({ ...footer!, logoUrl: cloudinaryUrl });
      setSuccess('Лого амжилттай орууллаа!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError(err instanceof Error ? err.message : 'Лого оруулахад алдаа гарлаа');
    } finally {
      setUploadingLogo(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFooter();
  }, []);

  if (loading) {
    return (
      <div className="w-full p-8 text-center">
        <Loader2 className="animate-spin h-12 w-12 mx-auto text-gray-400" />
        <p className="mt-4 text-gray-600">Footer мэдээллийг уншиж байна...</p>
      </div>
    );
  }

  if (!footer) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-gray-600">Footer мэдээлэл олдсонгүй</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Footer удирдах</h1>
          <p className="text-gray-600">Footer мэдээллийг засах</p>
        </div>
        <Button onClick={saveFooter} disabled={saving} className="flex items-center gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Хадгалж байна...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Хадгалах
            </>
          )}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            Хаах
          </button>
        </div>
      )}

      {/* Footer Form */}
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="company">Компанийн мэдээлэл</TabsTrigger>
          <TabsTrigger value="links">Холбоос</TabsTrigger>
          <TabsTrigger value="contact">Холбоо барих</TabsTrigger>
          <TabsTrigger value="bottom">Доод хэсэг</TabsTrigger>
        </TabsList>

        {/* Company Info Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Компанийн мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logoUrl">Лого (PNG зураг)</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Input
                        id="logoUrl"
                        type="file"
                        accept="image/png"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="cursor-pointer"
                      />
                    </div>
                    {uploadingLogo && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  {footer.logoUrl && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">Одоогийн лого:</p>
                      <img
                        src={footer.logoUrl}
                        alt="Footer logo"
                        className="h-16 w-auto object-contain border border-gray-200 rounded p-2 bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1 break-all">{footer.logoUrl}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Компанийн нэр</Label>
                  <Input
                    id="companyName"
                    value={footer.companyName || ''}
                    onChange={(e) => setFooter({ ...footer, companyName: e.target.value })}
                    placeholder="Tsaas.mn"
                  />
                </div>
                <div>
                  <Label htmlFor="companySuffix">Компанийн суффикс</Label>
                  <Input
                    id="companySuffix"
                    value={footer.companySuffix || ''}
                    onChange={(e) => setFooter({ ...footer, companySuffix: e.target.value })}
                    placeholder=".mn"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Тайлбар</Label>
                <Textarea
                  id="description"
                  value={footer.description || ''}
                  onChange={(e) => setFooter({ ...footer, description: e.target.value })}
                  placeholder="Аялалын бүх үйлчилгээ нэг дор"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links" className="space-y-4">
          {/* Social Links */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Олон нийтийн холбоос</CardTitle>
                <Button onClick={addSocialLink} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Нэмэх
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {footer.socialLinks.map((link, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Нэр</Label>
                    <Input
                      value={link.name}
                      onChange={(e) => updateSocialLink(index, 'name', e.target.value)}
                      placeholder="Facebook"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Дүрс (icon)</Label>
                    <Input
                      value={link.icon}
                      onChange={(e) => updateSocialLink(index, 'icon', e.target.value)}
                      placeholder="f"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>URL</Label>
                    <Input
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <Button
                    onClick={() => removeSocialLink(index)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {footer.socialLinks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Олон нийтийн холбоос байхгүй байна
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Хурдан холбоос</CardTitle>
                <Button onClick={addQuickLink} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Нэмэх
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {footer.quickLinks.map((link, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Нэр</Label>
                    <Input
                      value={link.label}
                      onChange={(e) => updateQuickLink(index, 'label', e.target.value)}
                      placeholder="Нүүр"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>URL</Label>
                    <Input
                      value={link.url}
                      onChange={(e) => updateQuickLink(index, 'url', e.target.value)}
                      placeholder="#"
                    />
                  </div>
                  <Button
                    onClick={() => removeQuickLink(index)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {footer.quickLinks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Хурдан холбоос байхгүй байна
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Холбоо барих мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Утас</Label>
                <Input
                  id="phone"
                  value={footer.phone || ''}
                  onChange={(e) => setFooter({ ...footer, phone: e.target.value })}
                  placeholder="+976 7000-5060"
                />
              </div>
              <div>
                <Label htmlFor="email">Имэйл</Label>
                <Input
                  id="email"
                  type="email"
                  value={footer.email || ''}
                  onChange={(e) => setFooter({ ...footer, email: e.target.value })}
                  placeholder="info@tsaas.mn"
                />
              </div>
              <div>
                <Label htmlFor="address">Хаяг</Label>
                <Textarea
                  id="address"
                  value={footer.address || ''}
                  onChange={(e) => setFooter({ ...footer, address: e.target.value })}
                  placeholder="Улаанбаатар хот, Хан-Уул дүүрэг..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottom Bar Tab */}
        <TabsContent value="bottom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Доод хэсгийн мэдээлэл</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="copyrightText">Зохиогчийн эрх</Label>
                <Input
                  id="copyrightText"
                  value={footer.copyrightText || ''}
                  onChange={(e) => setFooter({ ...footer, copyrightText: e.target.value })}
                  placeholder="© 2025 Tsaas.mn"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Footer холбоос</Label>
                  <Button onClick={addFooterLink} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Нэмэх
                  </Button>
                </div>
                <div className="space-y-4">
                  {footer.footerLinks.map((link, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Нэр</Label>
                        <Input
                          value={link.label}
                          onChange={(e) => updateFooterLink(index, 'label', e.target.value)}
                          placeholder="Нууцлалын бодлого"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>URL</Label>
                        <Input
                          value={link.url}
                          onChange={(e) => updateFooterLink(index, 'url', e.target.value)}
                          placeholder="#"
                        />
                      </div>
                      <Button
                        onClick={() => removeFooterLink(index)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {footer.footerLinks.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Footer холбоос байхгүй байна
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

