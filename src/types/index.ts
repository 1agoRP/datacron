export type Status = 'recebida' | 'não recebida' | 'recebida com atraso' | 'processada' | 'erro' | 'pendente';

export interface Condominio {
  id: string;
  numero: string;
  nome: string;
  endereco: string;
  cnpj: string;
  sindico: string;
  cpf_sindico: string;
  status: 'ativo' | 'inativo';
  contas_recebidas: number;
  contas_esperadas: number;
}

export interface Concessionaria {
  id: string;
  condominio_id: string;
  tipo: 'Enel' | 'Sabesp' | 'Comgás' | 'Outros';
  nome_exibicao: string;
  instalacao: string;
  dia_vencimento: number;
  valor_medio: number;
  email_esperado: string;
  regra_senha: string;
  status: 'ativo' | 'inativo';
}

export interface Fatura {
  id: string;
  condominio_id: string;
  concessionaria_id: string;
  referencia: string;
  vencimento: string;
  valor: number;
  status: Status;
  data_recebimento: string;
  pdf_original?: string;
  pdf_desbloqueado?: string;
  consumo?: string;
}

export interface Alerta {
  id: string;
  tipo: 'variação' | 'atraso' | 'erro_pdf' | 'duplicidade';
  mensagem: string;
  data: string;
  lido: boolean;
  gravidade: 'baixa' | 'media' | 'alta';
}
