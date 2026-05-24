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
      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 55%, #475569 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: '0 8px 32px rgba(30,41,59,0.22)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            flexShrink: 0,
          }}>
            <FileText size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Histórico de Reajustes</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>
              Acompanhe o histórico de reajustes aplicados às concessionárias do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        marginBottom: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar reajustes..."
            style={{
              width: '100%', height: 38, padding: '0 14px 0 36px',
              borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc',
              fontSize: '0.875rem', fontFamily: 'inherit', color: '#0f172a',
              transition: 'all 0.2s', outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={{ width: 1, height: 24, background: '#e2e8f0', flexShrink: 0 }} />

        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#0f172a' }}>{filteredConc.length}</span> {filteredConc.length !== 1 ? 'registros' : 'registro'}
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
