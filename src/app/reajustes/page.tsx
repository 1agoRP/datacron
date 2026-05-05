'use client';

import React, { useState, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Search, FileText, Zap,
  Info
} from 'lucide-react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { ReajusteConcessionaria, isReadOnly } from '@/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReajustesPage() {
  const { user } = useAuth();
  const readOnly = isReadOnly(user);

  // CONCESSIONARIA DATA
  const { data: reajustesConc = [], isLoading: loadingConc } = useSWR(
    'reajustes_concessionarias',
    () => api.getReajustesConcessionariaHistorico(),
    { revalidateOnFocus: true }
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConc = useMemo(() => {
    let result = [...reajustesConc];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.tipo_concessionaria.toLowerCase().includes(q) ||
        (r.aplicado_por || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [reajustesConc, searchTerm]);

  const handleDownloadConc = async (r: ReajusteConcessionaria) => {
    try {
      await api.downloadDocumentoReajusteConcessionaria(r.id);
    } catch (err: any) {
      alert('Erro ao baixar documento: ' + err.message);
    }
  };

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Histórico de Reajustes das Concessionárias</h1>
          <p className="dc-page-subtitle">Acompanhe o histórico de reajustes aplicados às concessionárias do sistema.</p>
        </div>
      </div>

      <div className="dc-filter-bar">
        <div className="dc-filter-search">
          <Search />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar reajustes..."
          />
        </div>

        <div className="dc-filter-divider" />
        <span className="dc-filter-count">
          {filteredConc.length} registro{filteredConc.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="dc-card">
        <div className="dc-table-wrapper">
          <table className="dc-table">
            <thead>
              <tr>
                <th>Concessionária</th>
                <th>Reajuste (%)</th>
                <th>Mês Aplicação</th>
                <th>Impacto</th>
                <th>Aplicado Por</th>
                <th>Documento</th>
              </tr>
            </thead>
            <tbody>
              {loadingConc ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filteredConc.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="dc-condo-icon" style={{ width: 32, height: 32 }}>
                        <Zap size={16} />
                      </div>
                      <div className="dc-cell-primary">{r.tipo_concessionaria}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.05rem' }}>
                      +{(r.percentual || 0).toFixed(2).replace('.', ',')}%
                    </div>
                  </td>
                  <td>
                    <div className="dc-cell-primary">
                      {r.mes_aplicacao ? format(parseISO(r.mes_aplicacao + '-01'), 'MMMM yyyy', { locale: ptBR }) : '—'}
                    </div>
                  </td>
                  <td>
                    <div className="dc-cell-secondary">
                      <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {r.registros_afetados} vinculações atualizadas
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="dc-user-avatar" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>
                        {r.aplicado_por?.substring(0, 2).toUpperCase() || 'OP'}
                      </div>
                      <div className="dc-cell-secondary">{r.aplicado_por}</div>
                    </div>
                  </td>
                  <td>
                    {(r.documento_base64) ? (
                      <button className="dc-btn dc-btn-ghost" style={{ padding: '0 8px', height: 28 }} onClick={() => handleDownloadConc(r)}>
                        <FileText size={14} color="#3b82f6" />
                        <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Baixar</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sem anexo</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loadingConc && filteredConc.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
                    <HistoryIcon size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>Nenhum reajuste de concessionária no histórico</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

const HistoryIcon = ({ size, style, opacity }: { size: number, style?: any, opacity?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...style, opacity }}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);
