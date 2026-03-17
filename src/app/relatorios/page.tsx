'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  BarChart2, FileText, Building2, Calendar, Filter,
  Download, TrendingUp, Zap, AlertCircle,
  CheckCircle2, ArrowUpRight, BrainCircuit
} from 'lucide-react';

import { api, API_BASE_URL } from '@/lib/api';

const reports = [
  {
    icon: BrainCircuit,
    title: 'Relatório Analítico',
    desc: 'Visão geral com inteligência artificial sobre o Datacron atual.',
    color: '#faf5ff',
    iconColor: '#9333ea',
    key: 'relatorio_analitico',
  },
  {
    icon: Building2,
    title: 'Por Condomínio',
    desc: 'Histórico completo de faturas e variações de custo por unidade.',
    color: '#eff6ff',
    iconColor: '#2563eb',
    key: 'por_condominio',
  },
  {
    icon: Zap,
    title: 'Por Concessionária',
    desc: 'Análise agregada de consumo e gastos por tipo de utilidade.',
    color: '#fff7ed',
    iconColor: '#ea580c',
    key: 'por_concessionaria',
  },
  {
    icon: Calendar,
    title: 'Por Período',
    desc: 'Consolidado mensal, trimestral ou anual de todas as faturas.',
    color: '#f0fdf4',
    iconColor: '#16a34a',
    key: 'por_periodo',
  },
  {
    icon: CheckCircle2,
    title: 'Recebidas no Prazo',
    desc: 'Relatório de pontualidade no recebimento das faturas esperadas.',
    color: '#ecfeff',
    iconColor: '#0891b2',
    key: 'recebidas_no_prazo',
  },
  {
    icon: TrendingUp,
    title: 'Variação de Valor',
    desc: 'Detecção e histórico de faturas com variação acima do padrão.',
    color: '#fef2f2',
    iconColor: '#dc2626',
    key: 'variacao_de_valor',
  },
  {
    icon: AlertCircle,
    title: 'Contas Pendentes',
    desc: 'Lista de contas esperadas que ainda não foram recebidas no ciclo.',
    color: '#fffbeb',
    iconColor: '#d97706',
    key: 'contas_pendentes',
  },
];

type FormatoType = 'excel' | 'csv' | 'pdf';

export default function RelatoriosPage() {
  const [selectedFormat, setSelectedFormat] = useState<FormatoType>('excel');
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generatedHistory, setGeneratedHistory] = useState([
    { name: 'Relatório Março – Condomínios', date: '10/03/2026 09:20', user: 'Iago Prado', fmt: 'Excel', key: 'por_condominio' },
    { name: 'Variação de Valor – Fevereiro', date: '05/03/2026 14:00', user: 'Iago Prado', fmt: 'PDF', key: 'variacao_de_valor' },
    { name: 'Contas Pendentes – Fevereiro', date: '01/03/2026 10:30', user: 'Iago Prado', fmt: 'CSV', key: 'contas_pendentes' },
  ]);

  const downloadFile = async (formato: FormatoType, downloadName: string) => {
    const token = localStorage.getItem('datacron_token');
    const backendFormat = formato;
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/faturas/exportar?formato=${backendFormat}`, {
      headers
    });

    if (!response.ok) {
      throw new Error('Falha ao gerar relatório');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = formato === 'csv' ? 'csv' : formato === 'pdf' ? 'pdf' : 'xlsx';
    a.download = `${downloadName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      await downloadFile(selectedFormat, 'faturas_exportadas');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (report: typeof reports[0]) => {
    try {
      setGeneratingReport(report.key);
      const safeName = report.title.replace(/\s+/g, '_').toLowerCase();
      
      let realFmt = selectedFormat;
      
      if (report.key === 'relatorio_analitico') {
        const token = localStorage.getItem('datacron_token');
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/faturas/relatorio-analitico/download`, {
          headers
        });

        if (!response.ok) {
          throw new Error('Falha ao gerar relatório analítico de IA');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_analitico_ia.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        realFmt = 'pdf';
      } else {
        await downloadFile(selectedFormat, `relatorio_${safeName}`);
      }

      // Add to history
      const now = new Date();
      const dateStr = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const currentMonth = now.toLocaleDateString('pt-BR', { month: 'long' });
      const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
      const fmtLabel = realFmt === 'excel' ? 'Excel' : realFmt === 'csv' ? 'CSV' : 'PDF';

      setGeneratedHistory(prev => [
        {
          name: `${report.title} – ${capitalizedMonth}`,
          date: dateStr,
          user: 'Iago Prado',
          fmt: fmtLabel,
          key: report.key,
        },
        ...prev,
      ]);
    } catch (e: any) {
      alert('Erro ao gerar relatório: ' + e.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDownloadFromHistory = async (row: typeof generatedHistory[0]) => {
    try {
      if (row.key === 'relatorio_analitico') {
        const token = localStorage.getItem('datacron_token');
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/faturas/relatorio-analitico/download`, { headers });
        if (!response.ok) throw new Error('Falha ao baixar relatório analítico de IA');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_analitico_ia.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const fmt: FormatoType = row.fmt === 'CSV' ? 'csv' : row.fmt === 'PDF' ? 'pdf' : 'excel';
        const safeName = row.name.replace(/\s+/g, '_').toLowerCase();
        await downloadFile(fmt, safeName);
      }
    } catch (e: any) {
      alert('Erro ao baixar relatório: ' + e.message);
    }
  };

  const formatLabels: Record<string, FormatoType> = {
    'Excel': 'excel',
    'PDF': 'pdf',
    'CSV': 'csv',
  };

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Relatórios</h1>
          <p className="dc-page-subtitle">
            Gere relatórios analíticos por condomínio, concessionária, período ou status.
          </p>
        </div>
        <div className="dc-page-header-actions">
          {/* Format selector */}
          <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {Object.entries(formatLabels).map(([label, value]) => (
              <button
                key={label}
                onClick={() => setSelectedFormat(value)}
                style={{
                  padding: '0 16px',
                  height: 40,
                  background: selectedFormat === value ? '#2563eb' : '#fff',
                  color: selectedFormat === value ? '#fff' : '#64748b',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRight: label !== 'CSV' ? '1px solid #e2e8f0' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="dc-btn dc-btn-primary" onClick={handleExport} disabled={loading}>
            {loading ? <div className="dc-loading-spinner" style={{width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent'}} /> : <Download size={16} />}
            {loading ? 'Exportando...' : `Exportar ${selectedFormat === 'csv' ? 'CSV' : selectedFormat === 'pdf' ? 'PDF' : 'Excel'}`}
          </button>
        </div>
      </div>

      {/* Quick filter */}
      <div className="dc-filter-bar" style={{ marginBottom: 24 }}>
        <div className="dc-filter-search">
          <Filter style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', width: 16, height: 16 }} />
          <input placeholder="Filtrar por condomínio ou período..." style={{ paddingLeft: 38 }} />
        </div>
        <div style={{ 
          height: 40, padding: '0 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8,
          background: '#f1f5f9', borderRadius: 10, fontWeight: 600, color: '#475569'
        }}>
          <span style={{ 
            background: selectedFormat === 'excel' ? '#16a34a' : selectedFormat === 'csv' ? '#ea580c' : '#dc2626',
            color: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 
          }}>
            {selectedFormat.toUpperCase()}
          </span>
          Formato selecionado
        </div>
      </div>

      {/* Reports grid */}
      <div className="dc-reports-grid">
        {reports.map((r, i) => {
          const isGenerating = generatingReport === r.key;
          return (
            <div key={i} className="dc-report-card">
              <div className="dc-report-icon" style={{ background: r.color, color: r.iconColor }}>
                <r.icon size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>
                  {r.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                  {r.desc}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  className="dc-btn dc-btn-primary"
                  style={{ flex: 1, justifyContent: 'center', height: 38, fontSize: '0.82rem' }}
                  onClick={() => handleGenerateReport(r)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="dc-loading-spinner" style={{width: 12, height: 12, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent'}} />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Gerar {selectedFormat === 'csv' ? 'CSV' : selectedFormat === 'pdf' ? 'PDF' : 'Excel'}
                    </>
                  )}
                </button>
                <button
                  className="dc-btn dc-btn-secondary"
                  style={{ height: 38, padding: '0 12px', fontSize: '0.82rem' }}
                  onClick={() => handleGenerateReport(r)}
                  disabled={isGenerating}
                  title="Gerar e abrir em nova aba"
                >
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary section */}
      <div className="dc-card dc-card-p" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span className="dc-card-title">Histórico de Relatórios Gerados</span>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Últimos 30 dias</span>
        </div>
        <table className="dc-table">
          <thead>
            <tr>
              <th>Relatório</th>
              <th>Gerado em</th>
              <th>Gerado por</th>
              <th>Formato</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {generatedHistory.map((row, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} />
                    </div>
                    <span className="dc-cell-primary">{row.name}</span>
                  </div>
                </td>
                <td><span className="dc-cell-secondary">{row.date}</span></td>
                <td><span className="dc-cell-secondary">{row.user}</span></td>
                <td>
                  <span className={`dc-badge ${row.fmt === 'Excel' ? 'dc-badge-green' : row.fmt === 'CSV' ? 'dc-badge-amber' : 'dc-badge-red'}`}>
                    {row.fmt}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      className="dc-btn dc-btn-secondary"
                      style={{ height: 32, padding: '0 12px', fontSize: '0.78rem', gap: 6 }}
                      onClick={() => handleDownloadFromHistory(row)}
                    >
                      <Download size={13} /> Baixar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {generatedHistory.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Nenhum relatório gerado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
