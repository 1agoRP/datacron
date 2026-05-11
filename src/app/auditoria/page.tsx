'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import { Shield, CheckCircle2, XCircle, Clock, AlertCircle, Search, FileText, Trash2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';

export default function AuditoriaPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Initial load
  useSWR(
    isAdmin ? 'alertas-audit-log' : null,
    () => api.getAlertasAuditLog(),
    { revalidateOnFocus: false }
  );

  const [activeTab, setActiveTab] = useState<'alertas' | 'sistema'>('alertas');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAcao, setFilterAcao] = useState<'todos' | 'resolvido' | 'descartado'>('todos');

  // Alert Logs
  const { data: alertLogs = [], isLoading: loadingAlerts } = useSWR(
    isAdmin && activeTab === 'alertas' ? 'alertas-audit-log' : null,
    () => api.getAlertasAuditLog(),
    { revalidateOnFocus: false }
  );

  // System Logs
  const { data: systemLogs = [], isLoading: loadingSystem } = useSWR(
    isAdmin && activeTab === 'sistema' ? 'system-audit-log' : null,
    () => api.getAuditLogs(),
    { revalidateOnFocus: false }
  );

  if (!isAdmin) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '120px 40px', color: '#94a3b8' }}>
          <Shield size={64} style={{ margin: '0 auto 20px', opacity: 0.2 }} />
          <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#475569' }}>Acesso Restrito</h2>
          <p style={{ fontSize: '0.9rem', marginTop: 8 }}>Este módulo é exclusivo para administradores.</p>
        </div>
      </Shell>
    );
  }

  const filteredAlerts = alertLogs.filter((log: any) => {
    if (filterAcao !== 'todos' && log.acao !== filterAcao) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.alerta_mensagem?.toLowerCase().includes(term) ||
        log.usuario_nome?.toLowerCase().includes(term) ||
        log.justificativa?.toLowerCase().includes(term) ||
        log.alerta_tipo?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const filteredSystem = systemLogs.filter((log: any) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.acao?.toLowerCase().includes(term) ||
        log.detalhes?.toLowerCase().includes(term) ||
        log.entidade_nome?.toLowerCase().includes(term) ||
        log.usuario_nome?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const stats = {
    total: alertLogs.length,
    resolvidos: alertLogs.filter((l: any) => l.acao === 'resolvido').length,
    descartados: alertLogs.filter((l: any) => l.acao === 'descartado').length,
  };

  const isLoadingLogs = activeTab === 'alertas' ? loadingAlerts : loadingSystem;
  const filtered = activeTab === 'alertas' ? filteredAlerts : filteredSystem;

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title" style={{ color: '#7c3aed' }}>Auditoria</h1>
          <p className="dc-page-subtitle">
            Acompanhe todas as ações críticas realizadas no sistema.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="dc-tabs" style={{ marginBottom: 24, borderBottom: '2px solid #f1f5f9' }}>
        <button
          className={`dc-tab ${activeTab === 'alertas' ? 'active' : ''}`}
          onClick={() => setActiveTab('alertas')}
          style={{
            padding: '12px 24px', fontSize: '0.9rem', fontWeight: activeTab === 'alertas' ? 800 : 600,
            borderBottom: activeTab === 'alertas' ? '3px solid #7c3aed' : 'none',
            color: activeTab === 'alertas' ? '#7c3aed' : '#64748b'
          }}
        >
          Alertas e Notificações
        </button>
        <button
          className={`dc-tab ${activeTab === 'sistema' ? 'active' : ''}`}
          onClick={() => setActiveTab('sistema')}
          style={{
            padding: '12px 24px', fontSize: '0.9rem', fontWeight: activeTab === 'sistema' ? 800 : 600,
            borderBottom: activeTab === 'sistema' ? '3px solid #7c3aed' : 'none',
            color: activeTab === 'sistema' ? '#7c3aed' : '#64748b'
          }}
        >
          Ações de Sistema (Infra)
        </button>
      </div>

      {activeTab === 'alertas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{
            padding: '20px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
            border: '1px solid #ddd6fe',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total de Ações</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4c1d95', marginTop: 4 }}>{stats.total}</div>
          </div>
          <div style={{
            padding: '20px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid #bbf7d0',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5 }}>Resolvidos</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#166534', marginTop: 4 }}>{stats.resolvidos}</div>
          </div>
          <div style={{
            padding: '20px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #fef2f2, #fecaca)',
            border: '1px solid #fecaca',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5 }}>Descartados</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#991b1b', marginTop: 4 }}>{stats.descartados}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="dc-form-input"
            style={{ paddingLeft: 36, height: 42 }}
            placeholder={activeTab === 'alertas' ? "Buscar por mensagem, usuário ou justificativa..." : "Buscar por ação, entidade ou usuário..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab === 'alertas' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {(['todos', 'resolvido', 'descartado'] as const).map(acao => (
              <button
                key={acao}
                className="dc-btn dc-btn-secondary"
                style={{
                  height: 42,
                  fontSize: '0.82rem',
                  fontWeight: filterAcao === acao ? 800 : 500,
                  background: filterAcao === acao
                    ? (acao === 'resolvido' ? '#dcfce7' : acao === 'descartado' ? '#fecaca' : '#e0e7ff')
                    : '#fff',
                  borderColor: filterAcao === acao
                    ? (acao === 'resolvido' ? '#86efac' : acao === 'descartado' ? '#fca5a5' : '#a5b4fc')
                    : '#e2e8f0',
                  color: filterAcao === acao
                    ? (acao === 'resolvido' ? '#166534' : acao === 'descartado' ? '#991b1b' : '#3730a3')
                    : '#64748b',
                }}
                onClick={() => setFilterAcao(acao)}
              >
                {acao === 'todos' ? 'Todos' : acao === 'resolvido' ? '✅ Resolvidos' : '🗑️ Descartados'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log List */}
      {isLoadingLogs ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="dc-loading-spinner" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: 16, color: '#64748b', fontSize: '0.9rem' }}>Carregando histórico...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dc-card dc-card-p" style={{ textAlign: 'center', padding: '80px 40px', color: '#94a3b8' }}>
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#475569' }}>Nenhum registro encontrado</div>
          <div style={{ fontSize: '0.875rem', marginTop: 6 }}>
            {searchTerm ? 'Tente outra busca.' : 'As ações aparecerão aqui.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeTab === 'alertas' ? (
            filtered.map((log: any) => {
              const isResolve = log.acao === 'resolvido';
              return (
                <div key={log.id} style={{
                  display: 'flex', gap: 16, padding: '18px 22px', background: '#fff',
                  border: `1px solid ${isResolve ? '#d1fae5' : '#fecaca'}`,
                  borderLeft: `4px solid ${isResolve ? '#10b981' : '#ef4444'}`,
                  borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: isResolve ? '#dcfce7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isResolve ? '#16a34a' : '#dc2626',
                  }}>
                    {isResolve ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: isResolve ? '#dcfce7' : '#fee2e2', color: isResolve ? '#166534' : '#991b1b' }}>
                        {isResolve ? 'Resolvido' : 'Descartado'}
                      </span>
                      <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
                        {log.alerta_tipo?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, marginBottom: 6 }}>{log.alerta_mensagem}</div>
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Justificativa</div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>"{log.justificativa}"</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.78rem', color: '#94a3b8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#4338ca' }}>
                          {log.usuario_nome?.substring(0, 2).toUpperCase()}
                        </div>
                        <strong style={{ color: '#475569' }}>{log.usuario_nome}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            filtered.map((log: any) => {
              const isDelete = log.acao?.includes('EXCLUSAO') || log.acao?.includes('DELETE');
              return (
                <div key={log.id} style={{
                  display: 'flex', gap: 16, padding: '18px 22px', background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderLeft: `4px solid ${isDelete ? '#ef4444' : '#3b82f6'}`,
                  borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: isDelete ? '#fee2e2' : '#dbeafe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDelete ? '#dc2626' : '#2563eb',
                  }}>
                    {isDelete ? <Trash2 size={22} /> : <Plus size={22} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: isDelete ? '#fee2e2' : '#dbeafe', color: isDelete ? '#991b1b' : '#1e40af' }}>
                        {log.acao}
                      </span>
                      <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
                        {log.entidade_tipo?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: 700, marginBottom: 4 }}>
                      {log.entidade_nome || 'Entidade ID: ' + log.entidade_id}
                    </div>
                    {log.detalhes && (
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                        {log.detalhes}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.78rem', color: '#94a3b8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#475569' }}>
                          {log.usuario_nome?.substring(0, 2).toUpperCase()}
                        </div>
                        <strong style={{ color: '#475569' }}>{log.usuario_nome}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Shell>
  );
}
