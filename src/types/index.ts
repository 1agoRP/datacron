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

export interface Contrato {
  id: string;
  condominio_id: string;
  empresa: string;
  tipo_contrato: string;
  tipo_personalizado: string | null;
  data_inicio: string;
  data_fim: string | null;
  valor_inicial: number;
  valor_atual: number;
  data_reajuste: string | null;
  indice_reajuste: string | null;
  ultimo_reajuste: string | null;
  periodicidade: string;
  arquivo_path: string | null;
  observacoes: string | null;
  status: string;
  condominio_nome: string | null;
  created_at: string;
  updated_at: string;
}
