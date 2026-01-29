const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || 'API Error');
    }

    return response.json();
  }

  // Auth endpoints
  async register(username: string, fullName: string, password: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, fullName, password }),
    });
  }

  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Categories endpoints
  async getCategories() {
    return this.request('/categories');
  }

  async getCategoriesByType(type: 'income' | 'expense') {
    return this.request(`/categories/${type}`);
  }

  // Entries endpoints
  async createEntry(data: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category_id?: number;
    date: string;
  }) {
    return this.request('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEntries(filters?: {
    type?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/entries?${queryString}` : '/entries';
    return this.request(endpoint);
  }

  async getEntryById(id: number) {
    return this.request(`/entries/${id}`);
  }

  async updateEntry(id: number, data: Partial<{
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category_id?: number;
    date: string;
  }>) {
    return this.request(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEntry(id: number) {
    return this.request(`/entries/${id}`, {
      method: 'DELETE',
    });
  }

  async getStats(filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString ? `/entries/stats?${queryString}` : '/entries/stats';
    return this.request(endpoint);
  }
}

export const apiService = new ApiService();
