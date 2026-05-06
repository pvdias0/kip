import { buildApiUrl } from "@/lib/api-config";

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const requestUrl = buildApiUrl(endpoint);
    const response = await fetch(requestUrl, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const isJsonResponse = contentType.includes("application/json");

    if (!response.ok) {
      const error = isJsonResponse
        ? JSON.parse(responseText)
        : {
            message: responseText.startsWith("<!doctype") || responseText.startsWith("<html")
              ? `Resposta HTML inesperada em ${requestUrl}`
              : response.statusText,
          };
      throw new Error(error.message || "API Error");
    }

    if (!isJsonResponse) {
      throw new Error(`Resposta nao JSON inesperada em ${requestUrl}`);
    }

    return JSON.parse(responseText);
  }

  async register(
    name: string,
    email: string,
    password: string,
    legalAcceptance: {
      termsAccepted: boolean;
      privacyAccepted: boolean;
      termsVersion: string;
      privacyVersion: string;
    },
  ) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, ...legalAcceptance }),
    });
  }

  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async verifyEmail(token: string) {
    const params = new URLSearchParams({ token });
    return this.request(`/auth/verify-email?${params.toString()}`);
  }

  async getProfile() {
    return this.request("/auth/profile");
  }

  async updateProfile(name: string, email: string) {
    return this.request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ name, email }),
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    return this.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  }

  async acceptLegalDocuments(data: {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    termsVersion: string;
    privacyVersion: string;
  }) {
    return this.request("/auth/legal-acceptance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCategories() {
    return this.request("/categories");
  }

  async createCategory(name: string) {
    return this.request("/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async deleteCategory(id: number) {
    return this.request(`/categories/${id}`, {
      method: "DELETE",
    });
  }

  async getCategoriesByType(type: "income" | "expense") {
    return this.request(`/categories/${type}`);
  }

  async getPaymentMethods() {
    return this.request("/payment-methods");
  }

  async createPaymentMethod(name: string, accountsEnabled: boolean) {
    return this.request("/payment-methods", {
      method: "POST",
      body: JSON.stringify({
        name,
        accounts_enabled: accountsEnabled,
      }),
    });
  }

  async updatePaymentMethod(
    id: number,
    data: Partial<{ name: string; accounts_enabled: boolean }>,
  ) {
    return this.request(`/payment-methods/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePaymentMethod(id: number) {
    return this.request(`/payment-methods/${id}`, {
      method: "DELETE",
    });
  }

  async createPaymentAccount(name: string) {
    return this.request("/payment-methods/accounts", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async updatePaymentAccount(id: number, name: string) {
    return this.request(`/payment-methods/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async deletePaymentAccount(id: number) {
    return this.request(`/payment-methods/accounts/${id}`, {
      method: "DELETE",
    });
  }

  async linkPaymentAccount(paymentMethodId: number, paymentAccountId: number) {
    return this.request(`/payment-methods/${paymentMethodId}/accounts`, {
      method: "POST",
      body: JSON.stringify({ payment_account_id: paymentAccountId }),
    });
  }

  async unlinkPaymentAccount(paymentMethodId: number, paymentAccountId: number) {
    return this.request(
      `/payment-methods/${paymentMethodId}/accounts/${paymentAccountId}`,
      {
        method: "DELETE",
      },
    );
  }

  async createEntry(data: {
    type: "income" | "expense";
    amount: number;
    description: string;
    category_id?: number;
    payment_method_id: number;
    payment_account_id?: number;
    date: string;
  }) {
    return this.request("/entries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getEntries(filters?: {
    type?: "income" | "expense";
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    const queryString = params.toString();
    const endpoint = queryString ? `/entries?${queryString}` : "/entries";
    return this.request(endpoint);
  }

  async getEntryById(id: number) {
    return this.request(`/entries/${id}`);
  }

  async updateEntry(
    id: number,
    data: Partial<{
      type: "income" | "expense";
      amount: number;
      description: string;
      category_id?: number;
      payment_method_id?: number;
      payment_account_id?: number;
      date: string;
    }>,
  ) {
    return this.request(`/entries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteEntry(id: number) {
    return this.request(`/entries/${id}`, {
      method: "DELETE",
    });
  }

  async getStats(filters?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/entries/stats?${queryString}`
      : "/entries/stats";
    return this.request(endpoint);
  }
}

export const apiService = new ApiService();
