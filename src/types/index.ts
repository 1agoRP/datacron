export interface Condominio {
  id: string;
  nome: string;
  numero: string;
  endereco: string;
  cnpj: string;
  sindico: string;
  cpf_sindico: string | null;
  administradora?: string | null;
  carteira?: number | null;
  gerente_id?: number | null;
  assistente_id?: number | null;
  ata_eleicao_nome?: string | null;
  ata_eleicao_inicio?: string | null;
  ata_eleicao_fim?: string | null;
  avcb_url?: string | null;
  avcb_inicio?: string | null;
  avcb_fim?: string | null;
  apolice_seguro_url?: string | null;
  apolice_seguro_inicio?: string | null;
  apolice_seguro_fim?: string | null;
  mandato_inicio?: string | null;
  mandato_fim?: string | null;
  leitura_individualizada_ativa?: boolean;
  contas_esperadas?: number;
  contas_recebidas?: number;
  ativo?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Concessionaria {
  id: string;
  condominio_id: string;
  tipo: string;
  instalacao: string;
  email_esperado: string | null;
  regra_senha: string;
  senha_manual: string | null;
  senha_portal: string | null;
  debito_automatico: boolean;
  dia_vencimento: number;
  valor_medio: number | null;
  nome_personalizado?: string | null;
  email_emissao?: string | null;
  leitura_individualizada?: boolean;
  created_by_id?: string;
  created_at: string;
  ativo: boolean;
  
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
  pdf_desbloqueado?: boolean;
  email_remetente?: string | null;
  email_assunto?: string | null;
  gmail_message_id?: string | null;
  dados_extraidos?: Record<string, any> | null;
  variacao_percentual?: number | null;
  debito_automatico?: boolean;
  created_at: string;

  condominio?: Condominio;
  concessionaria?: Concessionaria;
}

export interface Alerta {
  id: string;
  condominio_id: string | null;
  fatura_id: string | null;
  tipo: string;
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
  whatsapp?: string | null;
  administradora?: string | null;
  codigo_usuario?: number | null;
  condominios_ids?: string[];
  created_at: string;
}

// Helper to check if user role is read-only
export const READ_ONLY_ROLES = new Set(['concessionarias', 'contabilidade', 'orçamento', 'emissao', 'financeiro', 'providencias', 'geral']);
export const isReadOnly = (user: User | null): boolean => {
  if (!user) return true;
  return READ_ONLY_ROLES.has(user.role);
};

export interface DashboardStats {
  condominiosCount: number;
  activeAlerts: number;
  critical_alerts?: number;
  recebidasHoje: number;
  totalFaturado: number;
  condosSemAta?: number;
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
  razao_social?: string | null;
  cnpj_empresa?: string | null;
  email_contato?: string | null;
  telefone_contato?: string | null;
  tipo_contrato: string;
  tipo_personalizado: string | null;
  data_inicio: string;
  data_fim: string | null;
  assinado?: boolean;
  data_assinatura?: string | null;
  valor_inicial: number;
  valor_atual: number;
  data_reajuste: string | null;
  indice_reajuste: string | null;
  ultimo_reajuste: string | null;
  periodicidade: string;
  dia_vencimento?: number | null;
  pagamento_recebido?: boolean;
  arquivo_path: string | null;
  observacoes: string | null;
  status: string;
  condominio_nome: string | null;
  created_by_id?: string | null;
  created_at: string;
  updated_at: string;
  pagamentos?: ContratoPagamento[];
  pagamentos_recebidos?: number;
  pagamentos_pendentes?: number;
  total_previsto_ano?: number;
  total_recebido_ano?: number;
}

export interface ContratoPagamento {
  id?: string | null;
  contrato_id: string;
  ano: number;
  mes: number;
  mes_label: string;
  valor_previsto: number;
  valor_recebido?: number | null;
  recebido: boolean;
  data_recebimento?: string | null;
  observacoes?: string | null;
  pendente: boolean;
  vencido: boolean;
}

export interface ReajusteConcessionaria {
  id: string;
  tipo_concessionaria: string;
  percentual: number;
  mes_aplicacao: string;
  documento_nome?: string | null;
  documento_base64?: string | null;
  aplicado_por: string;
  registros_afetados: number;
  created_at: string;
}

export interface PrevisaoContaComplementar {
  nome: string;
  saldo_anterior: number;
  creditos: number;
  debitos: number;
  saldo_atual: number;
}

export interface PrevisaoDespesaDestaque {
  categoria: string;
  valor: number;
}

export interface PrevisaoAnalysis {
  arquivo?: string | null;
  referencia: string;
  mes: number;
  ano: number;
  condominio_codigo: string;
  condominio_nome: string;
  endereco: string;
  previsto: number;
  receita_boleto_mes: number;
  cotas_atrasadas_recebidas: number;
  cotas_em_aberto: number;
  receitas_ordinarias_totais: number;
  despesas_ordinarias: number;
  saldo_ordinaria: number;
  resultado_percentual: number;
  contas_complementares: PrevisaoContaComplementar[];
  maiores_despesas: PrevisaoDespesaDestaque[];
  flags: Record<string, boolean>;
  justificativa_despesas: string;
  sugestao_texto: string;
}
