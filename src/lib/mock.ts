import { Condominio, Concessionaria, Fatura, Alerta } from '@/types';

export const mockCondominios: Condominio[] = [
  {
    id: '1',
    numero: '0006',
    nome: 'Residencial Bela Vista',
    endereco: 'Av. Paulista, 1000 - São Paulo, SP',
    cnpj: '12.345.678/0001-90',
    sindico: 'Roberto Lima',
    cpf_sindico: '123.456.789-00',
    status: 'ativo',
    contas_recebidas: 8,
    contas_esperadas: 10
  },
  {
    id: '2',
    numero: '0012',
    nome: 'Edifício Horizonte',
    endereco: 'Rua Augusta, 500 - São Paulo, SP',
    cnpj: '98.765.432/0001-10',
    sindico: 'Maria Silva',
    cpf_sindico: '987.654.321-11',
    status: 'ativo',
    contas_recebidas: 12,
    contas_esperadas: 12
  },
  {
    id: '3',
    numero: '0025',
    nome: 'Parque das Flores',
    endereco: 'Estrada do Alvarenga, 2500 - Diadema, SP',
    cnpj: '45.123.789/0001-45',
    sindico: 'Ana Paula',
    cpf_sindico: '456.123.789-22',
    status: 'ativo',
    contas_recebidas: 5,
    contas_esperadas: 8
  }
];

export const mockConcessionarias: Concessionaria[] = [
  {
    id: 'c1',
    condominio_id: '1',
    tipo: 'Enel',
    nome_exibicao: 'ENEL - Unidade 69858373',
    instalacao: '69858373',
    dia_vencimento: 10,
    valor_medio: 1201.00,
    email_esperado: 'fatura@enel.com.br',
    regra_senha: '5_primeiros_cnpj',
    status: 'ativo'
  },
  {
    id: 'c2',
    condominio_id: '1',
    tipo: 'Sabesp',
    nome_exibicao: 'SABESP - Matrícula 4598001',
    instalacao: '4598001',
    dia_vencimento: 15,
    valor_medio: 3500.00,
    email_esperado: 'contas@sabesp.com.br',
    regra_senha: '3_primeiros_cnpj',
    status: 'ativo'
  }
];

export const mockFaturas: Fatura[] = [
  {
    id: 'f1',
    condominio_id: '1',
    concessionaria_id: 'c1',
    referencia: 'Março/2026',
    vencimento: '10/03/2026',
    valor: 1621.35,
    status: 'processada',
    data_recebimento: '04/03/2026',
    consumo: '450 kWh'
  },
  {
    id: 'f2',
    condominio_id: '1',
    concessionaria_id: 'c2',
    referencia: 'Março/2026',
    vencimento: '15/03/2026',
    valor: 3420.00,
    status: 'pendente',
    data_recebimento: '08/03/2026',
    consumo: '120 m³'
  }
];

export const mockAlertas: Alerta[] = [
  {
    id: 'a1',
    tipo: 'variação',
    mensagem: 'Variação de 35% no valor da ENEL do Condomínio Bela Vista',
    data: '08/03/2026 14:30',
    lido: false,
    gravidade: 'alta'
  },
  {
    id: 'a2',
    tipo: 'atraso',
    mensagem: 'Conta da COMGÁS do Edifício Horizonte ainda não foi recebida',
    data: '01/03/2026 09:00',
    lido: true,
    gravidade: 'media'
  }
];
