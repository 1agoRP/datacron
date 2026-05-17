'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import { AlertCircle, Clock, CheckCircle2, ArrowUpRight, Trash2, Shield, XCircle, X } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { isReadOnly } from '@/types';

export default function AlertasPage() {
  const { data: alertas = [], isLoading: loading, mutate } = useSWR(
    'alertas',
    () => api.getAlertas({ limit: 500 }),
    { revalidateOnFocus: true }
  );
  const [activeTab, setActiveTab] = useState('Todos');
  const [resolving, setResolving] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<string | null>(null);

  // Justification modal state
  const [justModal, setJustModal] = useState<{ alerta: any; acao: 'resolver' | 'descartar' } | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [justSubmitting, setJustSubmitting] = useState(false);

  const { user } = useAuth();
  const readOnly = isReadOnly(user);

  const handleResolve = (alerta: any) => {
    setJustModal({ alerta, acao: 'resolver' });
    setJustificativa('');
  };

  const handleDiscard = (alerta: any) => {
    setJustModal({ alerta, acao: 'descartar' });
    setJustificativa('');
  };

  const handleJustSubmit = async () => {
    if (!justModal || !justificativa.trim()) return;
    const { alerta, acao } = justModal;
    try {
      setJustSubmitting(true);
      if (acao === 'resolver') {
        setResolving(alerta.id);
        await api.resolveAlerta(alerta.id, justificativa.trim());

        const isEmailIssue = alerta.tipo === 'email_nao_identificado';
        const senderMatch = alerta.mensagem.match(/de '([^']+)'/);
        const sender = senderMatch ? senderMatch[1] : 'remetente';

        if (isEmailIssue) {
          alert(
            `✅ Pendência resolvida!\n\n` +
            `Uma resposta padrão foi enviada para '${sender}' informando que a concessionária não foi ` +
            `localizada no cadastro.\n\n` +
            `Você também receberá um e-mail de confirmação.`
          );
        } else {
          alert(
            `✅ Alerta resolvido!\n\n` +
            `O alerta foi marcado como resolvido com sucesso.\n\n` +
            `Um e-mail de confirmação foi enviado para sua conta (${user?.email}).`
          );
        }
      } else {
        setDiscarding(alerta.id);
        await api.deleteAlerta(alerta.id, justificativa.trim());
        alert('🗑️ Alerta descartado com sucesso.');
      }
      setJustModal(null);
      setJustificativa('');
      mutate();
    } catch (err: any) {
      alert('Erro: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setJustSubmitting(false);
      setResolving(null);
      setDiscarding(null);
    }
  };

  const filtered = alertas.filter(a => {
    if (activeTab === 'Todos') return true;
    if (activeTab === 'Críticos') return a.gravidade === 'alta';
    if (activeTab === 'Fatura Alta') return a.tipo === 'variacao_valor';
    return a.tipo !== 'variacao_valor' && a.gravidade !== 'alta';
  });

  const counts = {
    Todos: alertas.length,
    Críticos: alertas.filter(a => a.gravidade === 'alta').length,
    'Fatura Alta': alertas.filter(a => a.tipo === 'variacao_valor').length,
    Outros: alertas.filter(a => a.tipo !== 'variacao_valor' && a.gravidade !== 'alta').length
  };

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title" style={{ color: '#dc2626' }}>Central de Alertas</h1>
          <p className="dc-page-subtitle">
            Monitore anomalias, vencimentos atrasados e erros de processamento em tempo real.
          </p>
        </div>
        <div className="dc-page-header-actions">
          <button className="dc-btn dc-btn-secondary" onClick={() => setActiveTab('Todos')}>
            <CheckCircle2 size={16} /> Limpar Filtros
          </button>
        </div>
      </div>

      {/* Alert count bar */}
      {alertas.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #fef3c7, #fef9c3)',
          border: '1px solid #fde68a', borderRadius: 12,
          padding: '14px 20px', marginBottom: 16,
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color="#92400e" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>
              {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} ativo{alertas.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Pills */}
      <div className="dc-alert-pills">
        {Object.entries(counts).map(([label, count]) => (
          <button
            key={label}
            className="dc-alert-pill"
            onClick={() => setActiveTab(label)}
            style={{
              color: activeTab === label ? '#dc2626' : '#64748b',
              borderColor: activeTab === label ? '#fecaca' : '#e2e8f0',
              background: activeTab === label ? '#fecaca33' : '#fff',
            }}
          >
            {label}
            <span className="dc-alert-pill-count">{count}</span>
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="dc-space-y-4">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.map(a => {
          const isUrgent = a.gravidade === 'alta';
          const isResolvingThis = resolving === a.id;
          const isDiscardingThis = discarding === a.id;

          return (
            <div key={a.id} className={`dc-full-alert ${isUrgent ? 'urgent' : 'medium'}`}>
              <div className={`dc-full-alert-icon ${isUrgent ? 'urgent' : 'medium'}`}>
                <AlertCircle size={24} />
              </div>

              <div className="dc-full-alert-body">
                <div className={`dc-full-alert-type ${isUrgent ? 'urgent' : 'medium'}`}>
                  {a.tipo.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div className="dc-full-alert-msg">{a.mensagem}</div>
                <div className="dc-full-alert-time">
                  <Clock size={12} /> {a.created_at ? format(new Date(a.created_at), "dd/MM 'às' HH:mm") : '—'}
                </div>
                {!readOnly && (
                  <div className="dc-full-alert-actions">
                    <button
                      className="dc-btn dc-btn-primary"
                      style={{ height: 34, padding: '0 14px', fontSize: '0.8rem', gap: 6 }}
                      onClick={() => handleResolve(a)}
                      disabled={isResolvingThis}
                    >
                      {isResolvingThis ? (
                        <><div className="dc-loading-spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} /> Resolvendo...</>
                      ) : (
                        <><ArrowUpRight size={14} /> Resolver Pendência</>
                      )}
                    </button>
                    <button
                      className="dc-btn dc-btn-danger"
                      style={{ height: 34, padding: '0 14px', fontSize: '0.8rem', gap: 6 }}
                      onClick={() => handleDiscard(a)}
                      disabled={isDiscardingThis}
                    >
                      {isDiscardingThis ? (
                        <><div className="dc-loading-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Descartando...</>
                      ) : (
                        <><Trash2 size={14} /> Descartar</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="dc-full-alert-meta">
                <span className={`dc-badge ${isUrgent ? 'dc-badge-red' : 'dc-badge-amber'}`}>
                  {isUrgent ? 'Alta' : 'Média'} gravidade
                </span>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div
            className="dc-card dc-card-p"
            style={{ textAlign: 'center', padding: '80px 40px', color: '#94a3b8' }}
          >
            <CheckCircle2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#475569' }}>
              Nenhum alerta ativo
            </div>
            <div style={{ fontSize: '0.875rem', marginTop: 6 }}>
              Tudo está funcionando corretamente.
            </div>
          </div>
        )}
      </div>

      {/* Justification Modal */}
      {justModal && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 480 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">
                {justModal.acao === 'resolver' ? '✅ Resolver Pendência' : '🗑️ Descartar Alerta'}
              </h2>
              <button className="dc-modal-close" onClick={() => setJustModal(null)}><X size={20} /></button>
            </div>
            <div className="dc-modal-body dc-space-y-4">
              <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  {justModal.alerta.tipo.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  {justModal.alerta.mensagem}
                </div>
              </div>

              <div className="dc-form-group">
                <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Justificativa <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="dc-form-input"
                  style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
                  placeholder="Descreva o motivo dessa ação..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                  Registrado por: <strong>{user?.nome}</strong> ({user?.email})
                </div>
              </div>
            </div>
            <div className="dc-modal-footer">
              <button
                type="button"
                className="dc-btn dc-btn-secondary"
                onClick={() => setJustModal(null)}
                disabled={justSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`dc-btn ${justModal.acao === 'resolver' ? 'dc-btn-primary' : 'dc-btn-danger'}`}
                disabled={justSubmitting || !justificativa.trim()}
                onClick={handleJustSubmit}
                style={{ minWidth: 160 }}
              >
                {justSubmitting
                  ? (justModal.acao === 'resolver' ? 'Resolvendo...' : 'Descartando...')
                  : (justModal.acao === 'resolver' ? 'Confirmar Resolução' : 'Confirmar Descarte')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
