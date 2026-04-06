/**
 * Datacron API Client
 * Centralized fetch wrapper with support for JWT authentication.
 */

import { Condominio, Concessionaria, Fatura, Alerta, User, DashboardStats, ChartData, ReajusteConcessionaria, ReajusteMercado } from '@/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Custom fetch wrapper with automatic retries for network-level failures ('Failed to fetch').
 * Does not retry on 4xx/5xx HTTP errors, only on connection drops/failures.
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, delay = 500): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    // Only retry safe, idempotent methods (GET by default if method is missing)
    const method = (options.method || 'GET').toUpperCase();
    const isIdempotent = ['GET', 'OPTIONS', 'HEAD', 'PUT', 'DELETE'].includes(method);
    
    if (retries > 0 && isIdempotent) {
      console.warn(`[Network Error] Retrying ${method} to ${url} in ${delay}ms... (${retries} retries left)`, err);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

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

    const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
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

    // Handle 204 No Content (e.g., DELETE endpoints)
    if (response.status === 204) {
      return undefined as any;
    }

    return response.json();
  }

  private async requestMultipart<T>(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = {
      ...options.headers,
    } as any;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let msg = 'Erro no processamento do arquivo';
      
      if (typeof errorData.detail === 'string') {
        msg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        msg = errorData.detail.map((e: any) => e.msg).join(', ');
      }
      
      throw new Error(msg);
    }

    return response.json();
  }

  // Auth
  async login(credentials: any) {
    const data = await this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        senha: credentials.senha
      }),
    });
    localStorage.setItem('datacron_token', data.access_token);
    // Also set cookie so Next.js middleware can protect routes server-side
    document.cookie = `datacron_token=${data.access_token}; path=/; SameSite=Strict; max-age=${60 * 60 * 24}`; // 24h
    return data;
  }

  async logout() {
    localStorage.removeItem('datacron_token');
    // Clear the cookie so middleware stops allowing access
    document.cookie = 'datacron_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    window.location.href = '/';
  }

  async updatePassword(data: { senha_atual: string; nova_senha: string }) {
    return this.request('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Dashboard & Stats
  async getDashboardStats() {
    const [faturas, alertas, countAlertas] = await Promise.all([
      this.getFaturas({ limit: 5 }),
      this.getAlertas({ limit: 5 }),
      this.request<{ nao_lidos: number }>('/alertas/contagem')
    ]);
    
    return {
      faturas,
      alertas,
      countAlertas,
    };
  }

  // Condominios
  async getCondominios(params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Condominio[]>(`/condominios/?${query}`);
  }

  async createCondominio(data: Partial<Condominio>) {
    return this.request('/condominios/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCondominio(id: string) {
    return this.request<Condominio>(`/condominios/${id}`);
  }

  async updateCondominio(id: string, data: Partial<Condominio>) {
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

  async uploadAtaEleicao(id: string, formData: FormData) {
    return this.requestMultipart(`/condominios/${id}/ata-eleicao`, formData, { method: 'POST' });
  }

  async downloadAtaEleicao(id: string) {
    const token = this.getToken();
    const response = await fetchWithRetry(`${API_BASE_URL}/condominios/${id}/ata-eleicao`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Falha ao baixar ATA de Eleição');
    }
    const blob = await response.blob();
    
    const disposition = response.headers.get('Content-Disposition');
    let filename = `ata_eleicao_${id}.pdf`;
    if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="(.+)"/);
        if (matches && matches.length > 1) {
            filename = matches[1];
        }
    }
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Concessionarias
  async getConcessionarias(params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Concessionaria[]>(`/concessionarias/?${query}`);
  }

  async createConcessionaria(data: Partial<Concessionaria>) {
    return this.request<Concessionaria>('/concessionarias/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConcessionaria(id: string, data: Partial<Concessionaria>) {
    return this.request<Concessionaria>(`/concessionarias/${id}`, {
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
    return this.requestMultipart('/concessionarias/extrair-dados', formData, { method: 'POST' });
  }

  async aplicarReajusteConcessionaria(formData: FormData) {
    return this.requestMultipart('/concessionarias/reajuste', formData, { method: 'POST' });
  }

  async getReajustesConcessionariaHistorico(tipo?: string) {
    const param = tipo ? `?tipo_concessionaria=${encodeURIComponent(tipo)}` : '';
    return this.request<ReajusteConcessionaria[]>(`/concessionarias/reajustes/historico${param}`);
  }

  // Faturas
  async getFaturas(params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Fatura[]>(`/faturas/?${query}`);
  }

  async getFatura(id: string) {
    return this.request<Fatura>(`/faturas/${id}`);
  }

  async exportFaturas(formato: 'excel' | 'csv' = 'excel') {
    const token = this.getToken();
    const headers = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetchWithRetry(`${API_BASE_URL}/faturas/exportar?formato=${formato}`, {
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
  async getAlertas(params: Record<string, string | boolean | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      safeParams[k] = String(v);
    }
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Alerta[]>(`/alertas/?${query}`);
  }

  async patchAlerta(id: string, data: Partial<Alerta>) {
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
    return this.request(`/alertas/${id}`, {
      method: 'DELETE',
    });
  }

  // Email Agent
  async getEmailLogs() {
    return this.request('/emails/logs');
  }

  async forceEmailScan() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    try {
      return await this.request('/emails/forcar-varredura', {
        method: 'POST',
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Tempo limite excedido. A varredura pode estar em andamento no servidor.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getAgentStatus() {
    return this.request('/emails/status');
  }

  // Importações
  async previewImport(formData: FormData) {
    return this.requestMultipart('/importacoes/preview', formData, { method: 'POST' });
  }

  async confirmImport(data: { tipo: string; rows: any[] }) {
    return this.request('/importacoes/confirmar', {
        method: 'POST',
        body: JSON.stringify(data)
    });
  }

  async downloadTemplate(tipo: 'condominios' | 'concessionarias') {
    const token = this.getToken();
    const response = await fetchWithRetry(`${API_BASE_URL}/importacoes/template/${tipo}`, {
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
    a.download = `template_${tipo}.csv`;
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

    const response = await fetchWithRetry(`${API_BASE_URL}/faturas/exportar?${params.toString()}`, {
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

  // Report History
  async getReportHistory() {
    return this.request<any[]>('/relatorios/historico');
  }

  async registerReport(data: { nome: string; tipo_relatorio: string; formato: string; usuario?: string }) {
    return this.request('/relatorios/registrar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboardKpis() {
    return this.request<{ condominios_count: number; recebidas_hoje: number; active_alerts: number }>('/dashboard/stats');
  }

  async getDashboardContasEsperadas(mes?: string) {
    const params = mes ? `?mes=${mes}` : '';
    return this.request<{ total_esperadas: number; recebidas: number; mes: string }>(`/dashboard/contas-esperadas${params}`);
  }

  async getDashboardChart(meses: number = 6, agrupar: string = 'mes') {
    return this.request<{ name: string; valor: number }[]>(`/dashboard/chart?meses=${meses}&agrupar=${agrupar}`);
  }

  // Faturas by condominio (for history)
  async getFaturasByCondominio(condominioId: string) {
    return this.request<Fatura[]>(`/faturas?condominio_id=${condominioId}&limit=100`);
  }

  // Contratos
  async getContratos(params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<any[]>(`/contratos/?${query}`);
  }

  async getContractTypes() {
    return this.request<string[]>('/contratos/tipos');
  }

  async getContratosStats() {
    return this.request<{ total: number; ativos: number; a_vencer: number; vencidos: number }>('/contratos/stats');
  }

  async createContrato(data: any) {
    return this.request('/contratos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContrato(id: string, data: any) {
    return this.request(`/contratos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteContrato(id: string) {
    return this.request(`/contratos/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadContratoPdf(formData: FormData) {
    return this.requestMultipart('/contratos/upload-pdf', formData, { method: 'POST' });
  }

  async uploadContratoArquivo(id: string, formData: FormData) {
    return this.requestMultipart(`/contratos/${id}/arquivo`, formData, { method: 'POST' });
  }

  async downloadContratoArquivo(id: string) {
    const token = this.getToken();
    const response = await fetchWithRetry(`${API_BASE_URL}/contratos/${id}/arquivo`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) throw new Error('Falha ao baixar arquivo');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Reajustes Mercado
  async getReajustesMercado(categoria?: string) {
    const param = categoria ? `?categoria=${encodeURIComponent(categoria)}` : '';
    return this.request<ReajusteMercado[]>(`/reajustes/${param}`);
  }

  async createReajusteMercado(formData: FormData) {
    return this.requestMultipart<ReajusteMercado>('/reajustes/', formData, { method: 'POST' });
  }

  async deleteReajusteMercado(id: string) {
    return this.request(`/reajustes/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadDocumentoReajusteMercado(id: string) {
    const token = this.getToken();
    const response = await fetchWithRetry(`${API_BASE_URL}/reajustes/${id}/documento`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) throw new Error('Falha ao baixar documento');
    const blob = await response.blob();
    
    const disposition = response.headers.get('Content-Disposition');
    let filename = `reajuste_${id}.pdf`;
    if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="(.+)"/);
        if (matches && matches.length > 1) {
            filename = matches[1];
        }
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const api = new ApiClient();
