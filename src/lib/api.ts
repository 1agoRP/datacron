/**
 * FOX API Client
 * Centralized fetch wrapper with support for JWT authentication.
 */

import { Condominio, Concessionaria, Fatura, Alerta, User, DashboardStats, ChartData, ReajusteConcessionaria, Contrato, PrevisaoAnalysis } from '@/types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Custom fetch wrapper with automatic retries for network-level failures ('Failed to fetch').
 * Does not retry on 4xx/5xx HTTP errors, only on connection drops/failures.
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, delay = 500): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    // Only retry safe, idempotent methods, OR any method if it is a network failure (server is warming up)
    const method = (options.method || 'GET').toUpperCase();
    const isIdempotent = ['GET', 'OPTIONS', 'HEAD', 'PUT', 'DELETE'].includes(method);
    const isNetworkError = err.message && (
      err.message.toLowerCase().includes('failed to fetch') || 
      err.message.toLowerCase().includes('networkerror') ||
      err.message.toLowerCase().includes('falha ao buscar')
    );
    
    if (retries > 0 && (isIdempotent || isNetworkError)) {
      console.warn(`[Network Error / Cold Start] Retrying ${method} to ${url} in ${delay}ms... (${retries} retries left). Error: ${err.message}`);
      if (isNetworkError) {
          // Longer delay for cold starts
          await new Promise(r => setTimeout(r, delay * 2));
          return fetchWithRetry(url, options, retries - 1, delay * 3);
      }
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    console.error(`[API Client] Final failure for ${method} ${url}:`, err);
    throw err;
  }
}

class ApiClient {
  private refreshTokenPromise: Promise<void> | null = null;

  private async attemptRefresh(): Promise<void> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const refreshUrl = `${API_BASE_URL}/auth/refresh`.replace(/([^:])\/\//g, '$1/');
        const res = await fetch(refreshUrl, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (!res.ok) throw new Error('Refresh failed');
        
        await res.json().catch(() => undefined);
      } catch (e) {
        throw e;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as any;

    const finalUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`.replace(/([^:])\/\//g, '$1/');

    let response = await fetchWithRetry(finalUrl, {
      ...options,
      mode: 'cors',
      credentials: 'include',
      headers,
    });

    if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      try {
        await this.attemptRefresh();
        response = await fetchWithRetry(finalUrl, {
          ...options,
          mode: 'cors',
          credentials: 'include',
          headers,
        });
      } catch (refreshError) {
        if (typeof window !== 'undefined' && endpoint !== '/auth/me') {
          window.location.href = '/';
        }
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
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
      } else {
        msg = `Erro ${response.status}: ${response.statusText || 'Falha na requisição'}`;
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
    const finalUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`.replace(/([^:])\/\//g, '$1/');

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    let response = await fetch(finalUrl, {
      ...options,
      method: options.method || 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      try {
        await this.attemptRefresh();
        response = await fetch(finalUrl, {
          ...options,
          method: options.method || 'POST',
          headers,
          credentials: 'include',
          body: formData,
        });
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let msg = `Erro no processamento (Status: ${response.status})`;
      
      if (typeof errorData.detail === 'string') {
        msg = errorData.detail;
      } else if (response.status === 413) {
        msg = 'O arquivo é muito grande para ser processado.';
      }
      
      throw new Error(msg);
    }

    return response.json();
  }

  // Auth
  async login(credentials: any) {
    const data = await this.request<{ access_token: string; expires_in: number; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        senha: credentials.senha
      }),
    });

    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Backend logout failed or ignored', e);
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  async updatePassword(data: { senha_atual: string; nova_senha: string }) {
    return this.request('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateProfile(data: { nome: string; role: string; whatsapp?: number | null }) {
    return this.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }


  // Condominios
  async getCondominios(params: Record<string, string | number | boolean> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Condominio[]>(`/condominios?${query}`);
  }

  async createCondominio(data: Partial<Condominio>) {
    return this.request('/condominios', {
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

  async getStatusContas(condominioId: string, params: { mes?: string | number; ano?: string | number } = {}) {
    const query = new URLSearchParams();
    if (params.mes) query.set('mes', String(params.mes));
    if (params.ano) query.set('ano', String(params.ano));
    const suffix = query.toString() ? `?${query}` : '';
    return this.request<any>(`/condominios/${condominioId}/status-contas${suffix}`);
  }

  // Document Management Methods (Base64)

  // Document Management Methods
  async saveAtaEleicao(id: string, data: { file: File; data_inicio?: string; data_fim?: string }) {
    const formData = new FormData();
    formData.append('pdf_file', data.file);
    if (data.data_inicio) formData.append('data_inicio', data.data_inicio);
    if (data.data_fim) formData.append('data_fim', data.data_fim);
    return this.requestMultipart(`/condominios/${id}/ata-eleicao`, formData, { method: 'POST' });
  }

  async downloadAtaEleicao(id: string) {
    const response = await fetchWithRetry(`${API_BASE_URL}/condominios/${id}/download/ata_eleicao`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Falha ao baixar ATA de Eleição');
    
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = `ata_eleicao_${id}.pdf`;
    if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
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


  async deleteAtaEleicao(id: string) {
    return this.request(`/condominios/${id}/ata-eleicao`, { method: 'DELETE' });
  }

  async saveAvcb(id: string, data: { file: File; data_inicio?: string; data_fim?: string }) {
    const formData = new FormData();
    formData.append('pdf_file', data.file);
    if (data.data_inicio) formData.append('data_inicio', data.data_inicio);
    if (data.data_fim) formData.append('data_fim', data.data_fim);
    return this.requestMultipart(`/condominios/${id}/avcb`, formData, { method: 'POST' });
  }

  async downloadAvcb(id: string) {
    const response = await fetchWithRetry(`${API_BASE_URL}/condominios/${id}/download/avcb`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Falha ao baixar AVCB');
    
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = `avcb_${id}.pdf`;
    if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
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

  async deleteAvcb(id: string) {
    return this.request(`/condominios/${id}/avcb`, { method: 'DELETE' });
  }

  async saveApolice(id: string, data: { file: File; data_inicio?: string; data_fim?: string }) {
    const formData = new FormData();
    formData.append('pdf_file', data.file);
    if (data.data_inicio) formData.append('data_inicio', data.data_inicio);
    if (data.data_fim) formData.append('data_fim', data.data_fim);
    return this.requestMultipart(`/condominios/${id}/apolice`, formData, { method: 'POST' });
  }

  async downloadApolice(id: string) {
    const response = await fetchWithRetry(`${API_BASE_URL}/condominios/${id}/download/apolice`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Falha ao baixar Apólice');
    
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = `apolice_${id}.pdf`;
    if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
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

  async deleteApolice(id: string) {
    return this.request(`/condominios/${id}/apolice`, { method: 'DELETE' });
  }

  // Concessionarias
  async getConcessionarias(params: Record<string, string | number | boolean> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Concessionaria[]>(`/concessionarias?${query}`);
  }

  async createConcessionaria(data: Partial<Concessionaria>) {
    return this.request<Concessionaria>('/concessionarias', {
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


  // Alertas
  async getAlertas(params: Record<string, string | boolean | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      safeParams[k] = String(v);
    }
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Alerta[]>(`/alertas?${query}`);
  }

  async patchAlerta(id: string, data: Partial<Alerta>) {
    return this.request(`/alertas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async resolveAlerta(id: string, justificativa: string) {
    return this.request(`/alertas/${id}/resolver`, {
      method: 'PUT',
      body: JSON.stringify({ justificativa }),
    });
  }

  async deleteAlerta(id: string, justificativa: string) {
    return this.request(`/alertas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ justificativa }),
    });
  }

  async getAlertasAuditLog() {
    return this.request<any[]>('/alertas/audit-log');
  }

  // Email Agent
  async getEmailLogs() {
    return this.request('/emails/logs');
  }

  async getAgentStatus() {
    return this.request('/emails/status');
  }

  async getInboxCount() {
    return this.request<{ inbox_count: number }>('/emails/inbox');
  }

  async getGmailStatus() {
    return this.request('/emails/gmail/status');
  }

  async getGmailAuthUrl() {
    return this.request('/emails/gmail/auth');
  }

  async getSessions() {
    return this.request('/auth/sessions');
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
    const response = await fetchWithRetry(`${API_BASE_URL}/importacoes/template/${tipo}`, {
      credentials: 'include',
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
    data_inicio?: string,
    data_fim?: string
  ) {
    const params = new URLSearchParams();
    if (data_inicio) params.set('data_inicio', data_inicio);
    if (data_fim) params.set('data_fim', data_fim);

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchWithRetry(`${API_BASE_URL}/relatorios/${tipo}/download${suffix}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Falha ao gerar relatório');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTipo = tipo.replace(/\s+/g, '_').toLowerCase();
    a.download = `relatorio_${safeTipo}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Report History
  async getReportHistory() {
    return this.request<any[]>('/relatorios/historico');
  }

  async registerReport(data: { nome: string; tipo_relatorio: string; formato: string; usuario?: string; data_inicio?: string; data_fim?: string }) {
    return this.request('/relatorios/registrar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<{ 
      kpis: {
        condominios_count: number; 
        recebidas_hoje: number; 
        active_alerts: number;
        critical_alerts: number;
        total_faturado: number;
        condos_sem_ata: number;
        faturas: Fatura[];
        alertas: Alerta[];
      }
    }>('/dashboard/stats');
  }

  async getDashboardContasEsperadas(mes?: string) {
    const params = mes ? `?mes=${mes}` : '';
    return this.request<{ total_esperadas: number; recebidas: number; mes: string }>(`/dashboard/contas-esperadas${params}`);
  }

  async getContasPorCondominio(mes?: string) {
    const params = mes ? `?mes=${mes}` : '';
    return this.request<{ id: string; nome: string; numero: string; esperadas: number; recebidas: number }[]>(`/dashboard/contas-por-condominio${params}`);
  }

  async getDashboardChart(meses: number = 6, agrupar: string = 'mes') {
    return this.request<{ name: string; valor: number }[]>(`/dashboard/chart?meses=${meses}&agrupar=${agrupar}`);
  }



  // Fornecedores
  async buscarFornecedorPorCnpj(cnpj: string) {
    const digits = cnpj.replace(/\D/g, '');
    return this.request<any>(`/fornecedores/buscar-cnpj?cnpj=${digits}`);
  }

  async criarFornecedor(data: {
    documentoFornecedor: string;
    nomeFornecedor: string;
    emailFornecedor?: string;
    whatsappFornecedor?: string;
    categoriaFornecedor?: string;
  }) {
    return this.request<any>('/fornecedores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Faturas by condominio (for history)

  async getGmailHistory(condominioId: string, concessionariaId: string) {
    return this.request<any[]>(`/condominios/${condominioId}/gmail-history?concessionaria_id=${concessionariaId}`);
  }

  async downloadGmailFatura(messageId: string, filename: string) {
    const response = await fetch(`${API_BASE_URL}/emails/gmail-download/${messageId}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Não foi possível baixar o arquivo do Gmail');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async downloadFatura(id: string) {
    const response = await fetchWithRetry(`${API_BASE_URL}/relatorios/faturas/${id}/pdf`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Falha ao baixar fatura');
    const blob = await response.blob();
    
    const disposition = response.headers.get('Content-Disposition');
    let filename = `fatura_${id}.pdf`;
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

  async getFornecedorCategorias() {
    return this.request<string[]>('/fornecedores/categorias');
  }

  async getHistoricoFaturas(condominioId?: string, concessionariaId?: string) {
    const params = new URLSearchParams();
    if (condominioId) params.append('condominio_id', condominioId);
    if (concessionariaId) params.append('concessionaria_id', concessionariaId);
    return this.request<any[]>(`/historico/?${params.toString()}`);
  }

  async getFornecedores() {
    return this.request<any[]>('/fornecedores');
  }


  async downloadDocumentoReajusteConcessionaria(id: string) {
    const response = await fetchWithRetry(`${API_BASE_URL}/concessionarias/reajustes/${id}/documento`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Falha ao baixar documento');
    const blob = await response.blob();
    
    const disposition = response.headers.get('Content-Disposition');
    let filename = `reajuste_conc_${id}.pdf`;
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

  // Histórico
  async getHistorico(params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<any[]>(`/historico?${query}`);
  }

  async downloadLoteFaturas(ids: string[]) {
    const response = await fetchWithRetry(`${API_BASE_URL}/relatorios/download-lote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(ids)
    });
    if (!response.ok) throw new Error('Falha ao baixar faturas em lote');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faturas_fox.zip';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async createFaturaManual(data: {
    condominio_id: string;
    concessionaria_id: string;
    valor: number;
    vencimento: string;
    referencia?: string;
    pdf_file?: File;
  }) {
    const formData = new FormData();
    formData.append('condominio_id', data.condominio_id);
    formData.append('concessionaria_id', data.concessionaria_id);
    formData.append('valor', String(data.valor));
    formData.append('vencimento', data.vencimento);
    if (data.referencia) formData.append('referencia', data.referencia);
    if (data.pdf_file) formData.append('pdf_file', data.pdf_file);
    return this.requestMultipart<Fatura>('/faturas/manual', formData, { method: 'POST' });
  }

  async deleteFatura(id: string) {
    return this.request(`/faturas/${id}`, { method: 'DELETE' });
  }

  async uploadFaturaPdf(faturaId: string, pdfFile: File) {
    const formData = new FormData();
    formData.append('pdf_file', pdfFile);
    return this.requestMultipart<{ status: string; pdf_nome: string; fatura_id: string }>(
      `/faturas/${faturaId}/upload-pdf`, formData, { method: 'PATCH' }
    );
  }

  async createFaturaManualFromAlerta(alertaId: string, pdfFile: File) {
    const formData = new FormData();
    formData.append('pdf_file', pdfFile);
    return this.requestMultipart<{ pdf_nome: string; fatura_id: string }>(
      `/alertas/${alertaId}/resolver-com-pdf`, formData, { method: 'POST' }
    );
  }

  // New Portfolio & Audit Features
  async getPortfolioStats() {
    return this.request<any[]>('/dashboard/portfolio-stats');
  }

  async getAuditLogs(params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<any[]>(`/auditoria?${query}`);
  }

  async downloadAllInvoices(referencia?: string) {
    const params = referencia ? `?referencia=${encodeURIComponent(referencia)}` : '';
    const response = await fetchWithRetry(`${API_BASE_URL}/condominios/download-all${params}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Falha ao gerar download em massa');
    }
    
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'Faturas.zip';
    
    if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
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

  // Contratos (admin)
  async getContratos(params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Contrato[]>(`/contratos${query ? `?${query}` : ''}`);
  }

  async getContratosDashboard(ano: number = new Date().getFullYear(), params: Record<string, string | number> = {}) {
    const safeParams: Record<string, string> = { ano: String(ano) };
    for (const [k, v] of Object.entries(params)) safeParams[k] = String(v);
    const query = new URLSearchParams(safeParams).toString();
    return this.request<Contrato[]>(`/contratos/dashboard?${query}`);
  }

  async getContratoStats(ano: number = new Date().getFullYear()) {
    return this.request<{
      total: number;
      ativos: number;
      a_vencer: number;
      vencidos: number;
      nao_assinados: number;
      valor_mensal: number;
      total_previsto_ano: number;
      total_recebido_ano: number;
      mensalidades_pendentes: number;
      mensalidades_vencidas: number;
    }>(`/contratos/stats?ano=${ano}`);
  }

  async createContrato(data: Partial<Contrato>) {
    return this.request<Contrato>('/contratos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContrato(id: string, data: Partial<Contrato>) {
    return this.request<Contrato>(`/contratos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteContrato(id: string) {
    return this.request(`/contratos/${id}`, { method: 'DELETE' });
  }

  async updateContratoPagamento(
    contratoId: string,
    mes: number,
    data: { valor_previsto?: number; valor_recebido?: number; recebido: boolean; data_recebimento?: string | null; observacoes?: string | null },
    ano: number = new Date().getFullYear()
  ) {
    return this.request(`/contratos/${contratoId}/pagamentos/${mes}?ano=${ano}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async exportContratos(formato: 'excel' | 'csv' = 'excel', ano: number = new Date().getFullYear()) {
    const response = await fetchWithRetry(`${API_BASE_URL}/contratos/exportar?formato=${formato}&ano=${ano}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Falha ao exportar contratos');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratos_fox.${formato === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Análise de Previsão (admin)
  async analyzePrevisaoBalancete(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestMultipart<PrevisaoAnalysis>('/previsao/analisar', formData, { method: 'POST' });
  }
}

export const api = new ApiClient();
