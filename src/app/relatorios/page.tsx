'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  BarChart2,
  BrainCircuit,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Presentation,
  Table2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type NotebookMode = 'slides' | 'tabela';
type NotebookStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

type ReportOption = {
  key: string;
  title: string;
  desc: string;
  outcome: string;
  notebookMode: NotebookMode;
  icon: React.ElementType;
  color: string;
  iconColor: string;
};

const reportOptions: ReportOption[] = [
  {
    key: 'briefing_executivo',
    title: 'Briefing Executivo da Carteira',
    desc: 'Resumo decisorio para diretoria: aderencia, valor monitorado, gargalos e prioridades.',
    outcome: 'Melhor para reuniao e apresentacao gerencial.',
    notebookMode: 'slides',
    icon: Presentation,
    color: '#eff6ff',
    iconColor: '#2563eb',
  },
  {
    key: 'mesa_operacional',
    title: 'Mesa Operacional de Pendencias',
    desc: 'Fila de ataque com faturas pendentes, erros e itens em revisao dentro do periodo.',
    outcome: 'Melhor para execucao diaria da equipe.',
    notebookMode: 'tabela',
    icon: ClipboardList,
    color: '#fff7ed',
    iconColor: '#ea580c',
  },
  {
    key: 'variacao_risco',
    title: 'Radar de Variacao e Risco',
    desc: 'Ranking de contas com maior desvio frente ao valor medio cadastrado.',
    outcome: 'Melhor para revisar contas fora do padrao.',
    notebookMode: 'tabela',
    icon: TrendingUp,
    color: '#fef2f2',
    iconColor: '#dc2626',
  },
  {
    key: 'concessionarias_estrategicas',
    title: 'Concessionarias Estrategicas',
    desc: 'Concentracao financeira por tipo de utilidade e leitura de impacto por fornecedor.',
    outcome: 'Melhor para negociar, priorizar e comparar utilities.',
    notebookMode: 'slides',
    icon: Zap,
    color: '#fffbeb',
    iconColor: '#d97706',
  },
  {
    key: 'condominios_criticos',
    title: 'Condominios Criticos',
    desc: 'Unidades com maior combinacao de pendencias, volume financeiro e necessidade de acao.',
    outcome: 'Melhor para decidir onde atacar primeiro.',
    notebookMode: 'tabela',
    icon: Building2,
    color: '#f0fdf4',
    iconColor: '#16a34a',
  },
  {
    key: 'pacote_notebooklm',
    title: 'Pacote NotebookLM',
    desc: 'PDF-fonte estruturado com narrativa, tabelas e instrucao para gerar slides ou tabelas no NotebookLM.',
    outcome: 'Melhor para subir como fonte e criar artefatos no NotebookLM.',
    notebookMode: 'slides',
    icon: BrainCircuit,
    color: '#faf5ff',
    iconColor: '#9333ea',
  },
];

function defaultStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function defaultEnd() {
  return new Date().toISOString().slice(0, 10);
}

function notebookStatusBadge(status?: NotebookStatus, error?: string) {
  const map = {
    pending: { label: 'Na fila', bg: '#eff6ff', color: '#2563eb' },
    processing: { label: 'Processando', bg: '#fff7ed', color: '#ea580c' },
    completed: { label: 'Criado', bg: '#f0fdf4', color: '#16a34a' },
    failed: { label: 'Falhou', bg: '#fef2f2', color: '#dc2626' },
    skipped: { label: 'Ignorado', bg: '#f8fafc', color: '#64748b' },
  };
  const item = map[status || 'pending'] || map.pending;
  return (
    <span
      title={error || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 9px',
        borderRadius: 999,
        background: item.bg,
        color: item.color,
        fontSize: '0.72rem',
        fontWeight: 900,
        whiteSpace: 'nowrap',
      }}
    >
      {item.label}
    </span>
  );
}

export default function RelatoriosPage() {
  const [dataInicio, setDataInicio] = useState(defaultStart);
  const [dataFim, setDataFim] = useState(defaultEnd);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedHistory, setGeneratedHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const selectedPeriod = useMemo(() => {
    const start = dataInicio ? format(new Date(`${dataInicio}T12:00:00`), 'dd/MM/yyyy') : 'inicio aberto';
    const end = dataFim ? format(new Date(`${dataFim}T12:00:00`), 'dd/MM/yyyy') : 'fim aberto';
    return `${start} a ${end}`;
  }, [dataInicio, dataFim]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        setGeneratedHistory(await api.getReportHistory());
      } catch (err) {
        console.error('Erro ao carregar historico:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
    const timer = window.setInterval(async () => {
      try {
        setGeneratedHistory(await api.getReportHistory());
      } catch (err) {
        console.error('Erro ao atualizar historico:', err);
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const downloadPdf = async (report: ReportOption) => {
    if (!dataInicio || !dataFim) {
      alert('Selecione a data inicial e final para gerar o relatorio.');
      return;
    }
    if (dataInicio > dataFim) {
      alert('A data inicial nao pode ser maior que a data final.');
      return;
    }

    try {
      setGeneratingReport(report.key);
      const params = new URLSearchParams({ data_inicio: dataInicio, data_fim: dataFim });
      const response = await fetch(`${API_BASE_URL}/relatorios/${report.key}/download?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Falha ao gerar relatorio PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fox_${report.key}_${dataInicio}_${dataFim}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await api.registerReport({
        nome: `${report.title} - ${selectedPeriod}`,
        tipo_relatorio: report.key,
        formato: 'pdf',
        data_inicio: dataInicio,
        data_fim: dataFim,
      });
      setGeneratedHistory(await api.getReportHistory());
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar relatorio.');
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDownloadFromHistory = async (row: any) => {
    const option = reportOptions.find((item) => item.key === row.tipo_relatorio) || reportOptions[0];
    await downloadPdf(option);
  };

  return (
    <Shell>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: '0 8px 32px rgba(37,99,235,0.22)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}>
            <BarChart2 size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.1 }}>Relatorios</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.78)', marginTop: 5 }}>
              PDFs executivos baseados no periodo selecionado, prontos para decisao e NotebookLM.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ height: 40, padding: '0 14px', borderRadius: 10, background: 'rgba(255,255,255,0.16)', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.82rem' }}>
            <FileText size={15} /> PDF unico
          </span>
        </div>
      </div>

      <div className="dc-filter-bar" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, flexWrap: 'wrap' }}>
          <Calendar size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Periodo-base</span>
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', fontFamily: 'inherit', color: '#0f172a', background: '#fff', maxWidth: 180 }}
          />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>ate</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', fontFamily: 'inherit', color: '#0f172a', background: '#fff', maxWidth: 180 }}
          />
        </div>
        <div style={{ height: 40, padding: '0 14px', borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '0.82rem' }}>
          <CheckCircle2 size={15} /> Todos os relatorios usam esta data
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <BrainCircuit size={18} color="#2563eb" />
            <strong style={{ color: '#0f172a' }}>Como usar com NotebookLM</strong>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem', lineHeight: 1.6 }}>
            Gere o PDF oficial. Em seguida, um worker seguro cria o notebook em segundo plano usando uma conta Google dedicada:
            slides para leitura executiva, tabela para operacao. O status aparece no historico.
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>Periodo selecionado</div>
          <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 900, marginTop: 6 }}>{selectedPeriod}</div>
        </div>
      </div>

      <div className="dc-reports-grid">
        {reportOptions.map((report) => {
          const isGenerating = generatingReport === report.key;
          const ModeIcon = report.notebookMode === 'slides' ? Presentation : Table2;
          return (
            <div key={report.key} className="dc-report-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div className="dc-report-icon" style={{ background: report.color, color: report.iconColor }}>
                  <report.icon size={22} />
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 9px',
                  borderRadius: 999,
                  background: report.notebookMode === 'slides' ? '#eff6ff' : '#f0fdf4',
                  color: report.notebookMode === 'slides' ? '#2563eb' : '#16a34a',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                }}>
                  <ModeIcon size={13} /> NotebookLM: {report.notebookMode === 'slides' ? 'Slides' : 'Tabela'}
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>{report.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.55 }}>{report.desc}</div>
                <div style={{ fontSize: '0.76rem', color: report.iconColor, fontWeight: 800, marginTop: 10 }}>{report.outcome}</div>
              </div>
              <button
                className="dc-btn dc-btn-primary"
                style={{ justifyContent: 'center', height: 40, fontSize: '0.82rem', marginTop: 4 }}
                onClick={() => downloadPdf(report)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="dc-loading-spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download size={14} /> Gerar PDF
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="dc-card dc-card-p" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span className="dc-card-title">Historico de PDFs Gerados</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>{generatedHistory.length} registro{generatedHistory.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="dc-table">
          <thead>
            <tr>
              <th>Relatorio</th>
              <th>Gerado em</th>
              <th>Gerado por</th>
              <th>Formato</th>
              <th>NotebookLM</th>
              <th style={{ textAlign: 'right' }}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loadingHistory ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="dc-loading-spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : generatedHistory.map((row, i) => (
              <tr key={row.id || i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} />
                    </div>
                    <span className="dc-cell-primary">{row.nome}</span>
                  </div>
                </td>
                <td><span className="dc-cell-secondary">{row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }) : '-'}</span></td>
                <td><span className="dc-cell-secondary">{row.usuario || 'Operador'}</span></td>
                <td><span className="dc-badge dc-badge-red">PDF</span></td>
                <td>{notebookStatusBadge(row.notebooklm_status, row.notebooklm_error)}</td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="dc-btn dc-btn-secondary" style={{ height: 32, padding: '0 12px', fontSize: '0.78rem', gap: 6 }} onClick={() => handleDownloadFromHistory(row)}>
                      <Download size={13} /> Regerar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loadingHistory && generatedHistory.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Nenhum PDF gerado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
