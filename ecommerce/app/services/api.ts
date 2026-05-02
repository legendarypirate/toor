// app/services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterData {
  phone: string;
  email?: string;
  password: string;
  full_name: string;
  role?: string;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  full_name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  avatar?: string;
  provider?: string;
  is_verified?: boolean;
  is_active?: boolean;
  created_at?: string;
  shippingAddress?: {
    address: string;
    city: string;
    district: string;
    khoroo: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  token?: string;
  user?: User;
}

class ApiService {
  private async request<T>(
    endpoint: string, 
    method: string = 'GET', 
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Create headers object with proper type
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: defaultHeaders,
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();

      if (!response.ok) {
        const error: any = new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<ApiResponse> {
    return this.request('/auth/login', 'POST', credentials);
  }

  async register(data: RegisterData): Promise<ApiResponse> {
    return this.request('/auth/register', 'POST', data);
  }

  async getGoogleAuthUrl(): Promise<ApiResponse<{ auth_url: string }>> {
    try {
      return await this.request('/auth/google', 'GET');
    } catch (error) {
      console.error('Failed to get Google auth URL:', error);
      return {
        success: false,
        message: 'Failed to get auth URL from backend',
        data: { auth_url: '' },
      };
    }
  }

  async googleCallback(code: string): Promise<ApiResponse> {
    return this.request(`/auth/google/callback?code=${code}`, 'GET');
  }

  async facebookLogin(data: { accessToken: string; userId: string; email?: string; name?: string }): Promise<ApiResponse> {
    return this.request('/auth/facebook', 'POST', data);
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse> {
    return this.request('/auth/refresh-token', 'POST', { refresh_token: refreshToken });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/auth/me', 'GET');
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', 'POST');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse> {
    return this.request('/auth/profile', 'PUT', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.request('/auth/change-password', 'PUT', { currentPassword, newPassword });
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    return this.request('/auth/forgot-password', 'POST', { email });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    return this.request('/auth/reset-password', 'POST', { token, password });
  }

  // Order methods
  async getOrders(): Promise<ApiResponse & { orders?: any[] }> {
    return this.request('/order', 'GET') as Promise<ApiResponse & { orders?: any[] }>;
  }

  async getOrderById(id: string): Promise<ApiResponse & { order?: any }> {
    return this.request(`/order/${id}`, 'GET') as Promise<ApiResponse & { order?: any }>;
  }

  // Address methods
  async getUserAddresses(): Promise<ApiResponse & { addresses?: any[] }> {
    return this.request('/user/addresses', 'GET') as Promise<ApiResponse & { addresses?: any[] }>;
  }

  async saveAddress(addressData: {
    city: string;
    district?: string;
    khoroo?: string;
    address: string;
    is_default?: boolean;
  }): Promise<ApiResponse & { address?: any; isDuplicate?: boolean }> {
    return this.request('/user/addresses', 'POST', addressData) as Promise<ApiResponse & { address?: any; isDuplicate?: boolean }>;
  }

  async deleteAddress(addressId: string): Promise<ApiResponse> {
    return this.request(`/user/addresses/${addressId}`, 'DELETE');
  }

  // Bank account methods
  async getActiveBankAccounts(): Promise<ApiResponse & { data?: any[] }> {
    return this.request('/bank-accounts/active', 'GET') as Promise<ApiResponse & { data?: any[] }>;
  }

  // Banner methods
  async getBanners(): Promise<ApiResponse & { data?: any[] }> {
    return this.request('/banner/published', 'GET') as Promise<ApiResponse & { data?: any[] }>;
  }
}

export const apiService = new ApiService();