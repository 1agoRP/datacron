/**
 * Datacron API Client
 * Centralized fetch wrapper with support for JWT authentication.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('datacron_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as any;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Clear token and redirect if unauthorized
      if (typeof window !== 'undefined' && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('datacron_token');
        window.location.href = '/';
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let msg = 'Erro na requisição';
      
      if (typeof errorData.detail === 'string') {
        msg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        // Pydantic validation errors
        msg = errorData.detail.map((e: any) => e.msg).join(', ');
      } else if (errorData.message) {
        msg = errorData.message;
      }
      
      throw new Error(msg);
    }

    return response.json();
  }

  // Auth
  async login(credentials: any) {
    const data = await this.request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        senha: credentials.senha
      }),
    });
    localStorage.setItem('datacron_token', data.access_token);
    return data;
  }

  async logout() {
    localStorage.removeItem('datacron_token');
    window.location.href = '/';
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Dashboard & Stats
  async getDashboardStats() {
    // These could be multiple parallel calls or a combined endpoint
    return {
      faturas: await this.getFaturas({ limit: 5 }),
      alertas: await this.getAlertas({ limit: 5 }),
      countAlertas: await this.request<{ nao_lidos: number }>('/alertas/contagem'),
    };
  }

  // Condominios
  async getCondominios(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/condominios/?${query}`);
  }

  async createCondominio(data: any) {
    return this.request('/condominios/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCondominio(id: string) {
    return this.request(`/condominios/${id}`);
  }

  async updateCondominio(id: string, data: any) {
    return this.request(`/condominios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCondominio(id: string) {
    return this.request(`/condominios/${id}`, {
      method: 'DELETE',
    });
  }

  // Concessionarias
  async getConcessionarias(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/concessionarias/?${query}`);
  }

  async createConcessionaria(data: any) {
    return this.request('/concessionarias/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConcessionaria(id: string, data: any) {
    return this.request(`/concessionarias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteConcessionaria(id: string) {
    return this.request(`/concessionarias/${id}`, {
      method: 'DELETE',
    });
  }

  async extrairDadosFatura(formData: FormData) {
    return fetch(`${API_BASE_URL}/concessionarias/extrair-dados`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${this.getToken()}`
        },
        body: formData
    }).then(r => r.json());
  }

  // Faturas
  async getFaturas(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/faturas/?${query}`);
  }

  async getFatura(id: string) {
    return this.request(`/faturas/${id}`);
  }

  async exportFaturas(formato: 'excel' | 'csv' = 'excel') {
    const token = this.getToken();
    const headers = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(`${API_BASE_URL}/faturas/exportar?formato=${formato}`, {
      headers
    });

    if (!response.ok) {
      throw new Error('Falha ao exportar faturas');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faturas.${formato === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Alertas
  async getAlertas(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<any[]>(`/alertas/?${query}`);
  }

  async patchAlerta(id: string, data: any) {
    return this.request(`/alertas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async resolveAlerta(id: string) {
    return this.request(`/alertas/${id}/resolver`, {
      method: 'PUT',
    });
  }

  async deleteAlerta(id: string) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/alertas/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Erro ao deletar alerta');
    }
    // 204 No Content - no body to parse
    return;
  }

  // Email Agent
  async getEmailLogs() {
    return this.request('/emails/logs');
  }

  async forceEmailScan() {
    return this.request('/emails/forcar-varredura', { method: 'POST' });
  }

  async getAgentStatus() {
    return this.request('/emails/status');
  }

  // Importações
  async previewImport(formData: FormData) {
    return fetch(`${API_BASE_URL}/importacoes/preview`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${this.getToken()}`
        },
        body: formData
    }).then(r => r.json());
  }

  async confirmImport(data: any) {
    return this.request('/importacoes/confirm', {
        method: 'POST',
        body: JSON.stringify(data)
    });
  }

  async downloadTemplate(tipo: 'condominios' | 'concessionarias') {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/importacoes/template/${tipo}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Falha ao baixar template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${tipo}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Reports
  async generateReport(
    tipo: string, 
    formato: 'excel' | 'csv' | 'pdf' = 'excel',
    periodo?: string,
    condominio_id?: string
  ) {
    // Reports use the faturas export endpoint with appropriate filters
    const token = this.getToken();
    const params = new URLSearchParams();
    params.set('formato', formato === 'pdf' ? 'excel' : formato); // PDF uses Excel then converts
    if (periodo) params.set('referencia', periodo);
    if (condominio_id) params.set('condominio_id', condominio_id);

    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/faturas/exportar?${params.toString()}`, {
      headers
    });

    if (!response.ok) {
      throw new Error('Falha ao gerar relatório');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = formato === 'csv' ? 'csv' : 'xlsx';
    const safeTipo = tipo.replace(/\s+/g, '_').toLowerCase();
    a.download = `relatorio_${safeTipo}.${ext}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const api = new ApiClient();
