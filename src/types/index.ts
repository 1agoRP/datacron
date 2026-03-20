export interface Condominio {
  id: string;
  nome: string;
  numero: string;
  endereco: string;
  cnpj: string;
  sindico: string;
  cpf_sindico: string;
  created_at: string;
}

export interface Concessionaria {
  id: string;
  condominio_id: string;
  tipo: string;
  instalacao: string;
  email_esperado: string | null;
  regra_senha: 'fixa' | 'dinamica';
  senha_manual: string | null;
  dia_vencimento: number;
  valor_medio: number | null;
  created_at: string;
  
  condominio?: Condominio;
}

export interface Fatura {
  id: string;
  condominio_id: string | null;
  concessionaria_id: string | null;
  referencia: string;
  vencimento: string | null;
  valor: number | null;
  status: 'pendente' | 'processada' | 'erro' | 'revisao';
  pdf_path: string | null;
  pdf_nome_original: string | null;
  created_at: string;

  condominio?: Condominio;
  concessionaria?: Concessionaria;
}

export interface Alerta {
  id: string;
  condominio_id: string | null;
  fatura_id: string | null;
  tipo: 'leitura' | 'vencimento' | 'variacao' | 'sistema' | 'email';
  mensagem: string;
  gravidade: 'baixa' | 'media' | 'alta';
  resolvido: boolean;
  created_at: string;

  condominio?: Condominio;
  fatura?: Fatura;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  created_at: string;
}

export interface DashboardStats {
  condominiosCount: number;
  activeAlerts: number;
  recebidasHoje: number;
  faturas: Fatura[];
  alertas: Alerta[];
}

export interface ChartData {
  name: string;
  valor: number;
}
