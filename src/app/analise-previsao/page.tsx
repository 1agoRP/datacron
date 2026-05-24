'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clipboard,
  FileText,
  Loader2,
  PenLine,
  RefreshCw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import Shell from '@/components/layout/Shell';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PrevisaoAnalysis } from '@/types';

const currentYear = new Date().getFullYear();

const sampleAnalysis: PrevisaoAnalysis = {
  arquivo: '160 BALANCETE.pdf',
  referencia: '04/2026',
  mes: 4,
  ano: 2026,
  condominio_codigo: '0160',
  condominio_nome: 'COND. ED. ANNA ELIZABETH',
  endereco: 'RUA APENINOS 990',
  previsto: 51383,
  receita_boleto_mes: 50668,
  cotas_atrasadas_recebidas: 0,
  cotas_em_aberto: 715,
  receitas_ordinarias_totais: 50984.52,
  despesas_ordinarias: 57776.61,
  saldo_ordinaria: 30268.8,
  resultado_percentual: -13.32,
  contas_complementares: [
    { nome: 'FUNDO DE RESERVA', saldo_anterior: 24701.29, creditos: 2784.89, debitos: 0, saldo_atual: 27486.18 },
    { nome: 'OBRAS', saldo_anterior: 126624.68, creditos: 6346.77, debitos: 0, saldo_atual: 132971.45 },
  ],
  maiores_despesas: [
    { categoria: 'Controle De Acesso / Portaria', valor: 18945 },
    { categoria: 'Serviços Públicos', valor: 7273.64 },
    { categoria: 'Limpeza', valor: 5764.99 },
    { categoria: 'Manutenções Eventuais', valor: 5500 },
    { categoria: 'Despesas Com Pessoal', valor: 4814.38 },
    { categoria: 'Manutenções', valor: 3021.86 },
  ],
  flags: {
    locacao: false,
    despesas_rateadas: false,
    receitas_rateadas: false,
    transferencia_contabil: false,
    cotas_antecipadas: false,
  },
  justificativa_despesas: '',
  sugestao_texto: '',
};

function brlInput(value: number) {
  return Number.isFinite(value) ? String(value) : '0';
}

function toNumber(value: string) {
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: number) {
  return `${value.toFixed(2).replace('.', ',')}%`;
}

function todayLong() {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
}

export default function AnalisePrevisaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [analysis, setAnalysis] = useState<PrevisaoAnalysis>(sampleAnalysis);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(sampleAnalysis.arquivo || '');
  const [manualText, setManualText] = useState('');
  const [expenseReason, setExpenseReason] = useState(
    'Esse aumento se justifica pelas manutenções eventuais ocorridas no período e respectivos materiais para execução dos serviços, com impacto direto nas despesas da conta ordinária.'
  );
  const [saldoComment, setSaldoComment] = useState('');
  const [directorName, setDirectorName] = useState('Mauro Persset Junior - Depto. de Condomínios');
  const [contactEmail, setContactEmail] = useState('maurojunior@propstarter.com.br');
  const [contactPhone, setContactPhone] = useState('(11) 9.5771-9284');
  const [formValues, setFormValues] = useState({
    previsto: brlInput(sampleAnalysis.previsto),
    receita_boleto_mes: brlInput(sampleAnalysis.receita_boleto_mes),
    cotas_atrasadas_recebidas: brlInput(sampleAnalysis.cotas_atrasadas_recebidas),
    receitas_ordinarias_totais: brlInput(sampleAnalysis.receitas_ordinarias_totais),
    despesas_ordinarias: brlInput(sampleAnalysis.despesas_ordinarias),
    saldo_ordinaria: brlInput(sampleAnalysis.saldo_ordinaria),
  });

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [router, user]);

  const editableAnalysis = useMemo(() => ({
    ...analysis,
    previsto: toNumber(formValues.previsto),
    receita_boleto_mes: toNumber(formValues.receita_boleto_mes),
    cotas_atrasadas_recebidas: toNumber(formValues.cotas_atrasadas_recebidas),
    receitas_ordinarias_totais: toNumber(formValues.receitas_ordinarias_totais),
    despesas_ordinarias: toNumber(formValues.despesas_ordinarias),
    saldo_ordinaria: toNumber(formValues.saldo_ordinaria),
  }), [analysis, formValues]);

  const metrics = useMemo(() => {
    const recebidoMes = editableAnalysis.receita_boleto_mes + editableAnalysis.cotas_atrasadas_recebidas;
    const recebimentoPercentual = editableAnalysis.previsto ? editableAnalysis.receita_boleto_mes / editableAnalysis.previsto * 100 : 0;
    const resultado = editableAnalysis.receitas_ordinarias_totais - editableAnalysis.despesas_ordinarias;
    const resultadoPercentual = editableAnalysis.receitas_ordinarias_totais ? resultado * 100 / editableAnalysis.receitas_ordinarias_totais : 0;
    return { recebidoMes, recebimentoPercentual, resultado, resultadoPercentual };
  }, [editableAnalysis]);

  const generatedText = useMemo(() => {
    const despesasStatus = editableAnalysis.despesas_ordinarias >= editableAnalysis.previsto ? 'acima do previsto' : 'dentro do previsto';
    const receitasStatus = editableAnalysis.receitas_ordinarias_totais < editableAnalysis.previsto ? 'abaixo do previsto' : 'acima do previsto';
    const recebidoStatus = metrics.recebidoMes >= editableAnalysis.previsto ? 'acima do total emitido para o mês' : 'abaixo do total emitido para o mês';
    const deficit = metrics.resultado < 0;
    const complementares = editableAnalysis.contas_complementares
      .map((conta) => `Com relação à conta ${conta.nome.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}, foi recebida a arrecadação mensal e o saldo encerrou em ${formatCurrency(conta.saldo_atual)}.`)
      .join('\n\n');

    return [
      `São Paulo, ${todayLong()}.`,
      `Ilmos.(as) Srs.(as).\nMembros do Corpo Diretivo do\n${editableAnalysis.condominio_nome}\n${editableAnalysis.endereco}\nSão Paulo / SP`,
      'ACOMPANHAMENTO PREVISÃO ORÇAMENTÁRIA',
      'Prezados(as) Senhores(as),',
      `Em análise do balancete deste mês de ${editableAnalysis.referencia}, foi possível observar que as despesas ordinárias, no cômputo geral, se realizaram ${despesasStatus}.`,
      `- Previsto: ${formatCurrency(editableAnalysis.previsto)}\n- Realizado: ${formatCurrency(editableAnalysis.despesas_ordinarias)}`,
      expenseReason,
      `No que se refere às receitas, o Condomínio recebeu ${percent(metrics.recebimentoPercentual)} das cotas do mês (${formatCurrency(editableAnalysis.receita_boleto_mes)}), ${editableAnalysis.cotas_atrasadas_recebidas ? `mais ${formatCurrency(editableAnalysis.cotas_atrasadas_recebidas)} de cotas atrasadas de períodos anteriores` : 'e não houve recebimento de cotas atrasadas de períodos anteriores'}, de modo que essas receitas ordinárias se realizaram ${recebidoStatus}.`,
      `- Recebimento das cotas do mês: ${formatCurrency(editableAnalysis.receita_boleto_mes)}\n- Recebimento de cotas em atraso: ${formatCurrency(editableAnalysis.cotas_atrasadas_recebidas)} (nominal)\n- Recebido: ${formatCurrency(metrics.recebidoMes)} | Emitido: ${formatCurrency(editableAnalysis.previsto)}`,
      `As receitas ordinárias totais, englobando todos os créditos contabilizados na conta ordinária, também se realizaram ${receitasStatus}.`,
      `- Total recebido: ${formatCurrency(editableAnalysis.receitas_ordinarias_totais)} | Receita prevista: ${formatCurrency(editableAnalysis.previsto)}`,
      `É possível concluir, portanto, que as receitas ordinárias totalizaram ${formatCurrency(editableAnalysis.receitas_ordinarias_totais)}, frente às despesas de ${formatCurrency(editableAnalysis.despesas_ordinarias)}, o que resulta em um ${deficit ? 'déficit' : 'superávit'} de ${percent(metrics.resultadoPercentual)}, de modo que o saldo da conta ordinária apresentou ${deficit ? 'redução' : 'aumento'} em relação ao mês anterior, encerrando em ${formatCurrency(editableAnalysis.saldo_ordinaria)}.`,
      saldoComment || (deficit ? 'Importante considerar que o déficit observado na conta ordinária ocorreu pois, além das despesas terem se realizado acima da previsão, as receitas totalizaram valor inferior ao previsto, o que deve ser objeto de atenção e acompanhamento próximo.' : 'Importante considerar que o superávit observado na conta ordinária reforça a preservação do saldo da conta ordinária no período.'),
      complementares,
      'Sendo o que tínhamos a informar, antecipadamente agradecemos e colocamo-nos à disposição para o esclarecimento de eventuais dúvidas.',
      `Atenciosamente,\n\nProp Starter Administração de Imóveis\n${directorName}\n${contactEmail}\n${contactPhone}`,
    ].filter(Boolean).join('\n\n');
  }, [editableAnalysis, expenseReason, saldoComment, metrics, directorName, contactEmail, contactPhone]);

  useEffect(() => {
    setManualText(generatedText);
  }, [generatedText]);

  if (user && !isAdmin) return null;

  const applyAnalysis = (data: PrevisaoAnalysis) => {
    setAnalysis(data);
    setFileName(data.arquivo || '');
    setFormValues({
      previsto: brlInput(data.previsto),
      receita_boleto_mes: brlInput(data.receita_boleto_mes),
      cotas_atrasadas_recebidas: brlInput(data.cotas_atrasadas_recebidas),
      receitas_ordinarias_totais: brlInput(data.receitas_ordinarias_totais),
      despesas_ordinarias: brlInput(data.despesas_ordinarias),
      saldo_ordinaria: brlInput(data.saldo_ordinaria),
    });
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    try {
      const data = await api.analyzePrevisaoBalancete(file);
      applyAnalysis(data);
    } catch (err: any) {
      alert(err.message || 'Não foi possível analisar o balancete.');
    } finally {
      setLoading(false);
    }
  };

  const setField = (field: keyof typeof formValues, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  return (
    <Shell>
      <div className="forecast-page">
        <div className="forecast-hero">
          <div className="forecast-hero-icon"><BarChart3 size={28} /></div>
          <div>
            <h1>Análise de Previsão</h1>
            <p>Transforme o balancete em uma carta de acompanhamento orçamentário revisável.</p>
          </div>
          <span className="forecast-admin-pill">Admin</span>
        </div>

        <div className="forecast-workspace">
          <section className="forecast-panel forecast-input-panel">
            <div className="forecast-panel-head">
              <div>
                <span>Entrada</span>
                <h2>Balancete e parâmetros</h2>
              </div>
              {loading ? <Loader2 className="forecast-spin" size={20} /> : <CheckCircle2 size={20} />}
            </div>

            <label className="forecast-upload">
              <input type="file" accept="application/pdf" onChange={handleFile} />
              <Upload size={22} />
              <div>
                <strong>{fileName || 'Enviar balancete em PDF'}</strong>
                <span>Use um arquivo no padrão do balancete operacional.</span>
              </div>
            </label>

            <div className="forecast-condo-strip">
              <div>
                <span>Condomínio</span>
                <strong>{analysis.condominio_codigo} · {analysis.condominio_nome}</strong>
              </div>
              <div>
                <span>Referência</span>
                <strong>{analysis.referencia || `01/${currentYear}`}</strong>
              </div>
            </div>

            <div className="forecast-kpis">
              <div><span>Recebimento</span><strong>{percent(metrics.recebimentoPercentual)}</strong></div>
              <div><span>Resultado</span><strong className={metrics.resultado < 0 ? 'danger' : 'success'}>{formatCurrency(metrics.resultado)}</strong></div>
              <div><span>Saldo ordinária</span><strong>{formatCurrency(editableAnalysis.saldo_ordinaria)}</strong></div>
            </div>

            <div className="forecast-section-title"><SlidersHorizontal size={16} /> Dados da planilha</div>
            <div className="forecast-form-grid">
              <label><span>Previsão emitida</span><input value={formValues.previsto} onChange={(e) => setField('previsto', e.target.value)} /></label>
              <label><span>Cotas do mês recebidas</span><input value={formValues.receita_boleto_mes} onChange={(e) => setField('receita_boleto_mes', e.target.value)} /></label>
              <label><span>Cotas atrasadas recebidas</span><input value={formValues.cotas_atrasadas_recebidas} onChange={(e) => setField('cotas_atrasadas_recebidas', e.target.value)} /></label>
              <label><span>Receitas ordinárias totais</span><input value={formValues.receitas_ordinarias_totais} onChange={(e) => setField('receitas_ordinarias_totais', e.target.value)} /></label>
              <label><span>Despesas ordinárias</span><input value={formValues.despesas_ordinarias} onChange={(e) => setField('despesas_ordinarias', e.target.value)} /></label>
              <label><span>Saldo da ordinária</span><input value={formValues.saldo_ordinaria} onChange={(e) => setField('saldo_ordinaria', e.target.value)} /></label>
            </div>

            <div className="forecast-section-title"><AlertTriangle size={16} /> Pontos que pedem atenção</div>
            <div className="forecast-highlights">
              {analysis.maiores_despesas.map((item) => (
                <div key={item.categoria}>
                  <span>{item.categoria}</span>
                  <strong>{formatCurrency(item.valor)}</strong>
                </div>
              ))}
            </div>

            <label className="forecast-text-field">
              <span>Justificativa das despesas</span>
              <textarea value={expenseReason} onChange={(e) => setExpenseReason(e.target.value)} rows={4} />
            </label>
            <label className="forecast-text-field">
              <span>Comentário sobre saldo/risco</span>
              <textarea value={saldoComment} onChange={(e) => setSaldoComment(e.target.value)} rows={3} placeholder="Opcional: ajuste a conclusão sobre o saldo." />
            </label>
          </section>

          <section className="forecast-panel forecast-editor-panel">
            <div className="forecast-panel-head">
              <div>
                <span>Sugestão de texto</span>
                <h2>Minuta editável</h2>
              </div>
              <button className="forecast-icon-btn" onClick={() => setManualText(generatedText)} title="Regerar texto">
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="forecast-editor-tools">
              <label><PenLine size={14} /> Responsável <input value={directorName} onChange={(e) => setDirectorName(e.target.value)} /></label>
              <label>E-mail <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></label>
              <label>Telefone <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></label>
            </div>

            <textarea
              className="forecast-document"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              spellCheck
            />

            <div className="forecast-editor-footer">
              <div><FileText size={16} /> Modelo inspirado no resultado esperado do PDF 160 04.2026.</div>
              <button className="dc-btn dc-btn-secondary" onClick={() => navigator.clipboard?.writeText(manualText)}>
                <Clipboard size={16} /> Copiar texto
              </button>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
