'use client';

import React, { useState, useRef } from 'react';
import Shell from '@/components/layout/Shell';
import { AlertCircle, Clock, CheckCircle2, ArrowUpRight, Trash2, X, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { isReadOnly } from '@/types';

// Tipos de alertas que indicam conta não recebida (sem fatura vinculada)
const TIPOS_CONTA_NAO_RECEBIDA = ['Nao_Recebida', 'Fatura_Sem_Debito_Automatico'];

export default function AlertasPage() {
  const { data: alertas = [], isLoading: loading, mutate } = useSWR(
    'alertas',
    () => api.getAlertas({ limit: 500 }),
    { revalidateOnFocus: true }
  );
  const [activeTab, setActiveTab] = useState('Todos');
  const [resolving, setResolving] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<string | null>(null);

  // Estado do modal de justificativa
  const [justModal, setJustModal] = useState<{ alerta: any; acao: 'resolver' | 'descartar' } | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [justSubmitting, setJustSubmitting] = useState(false);

  const { user } = useAuth();
  const readOnly = isReadOnly(user);

  // Upload rápido de PDF
  const [uploadingAlertId, setUploadingAlertId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAlertRef = useRef<any>(null);

  /**
   * Verifica se o alerta deve exibir o botão de upload.
   * Exibe apenas para contas não recebidas (sem fatura ainda no sistema)
   * ou para alertas que já possuem fatura vinculada (ex: erro de PDF).
   * NÃO exibe para alertas de variação de consumo/valor, pois a conta
   * já foi recebida e a variação pode ser avaliada diretamente.
   */
  const deveMostrarUpload = (alerta: any): boolean => {
    if (alerta.fatura_id) return true;
    return TIPOS_CONTA_NAO_RECEBIDA.includes(alerta.tipo);
  };

  const handleUploadClick = (alerta: any) => {
    pendingAlertRef.current = alerta;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const alerta = pendingAlertRef.current;
    if (!file || !alerta) return;

    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Apenas arquivos PDF são permitidos.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande (máximo 10 MB).');
      return;
    }

    try {
      setUploadingAlertId(alerta.id);

      if (alerta.fatura_id) {
        // Alerta já possui fatura vinculada — apenas faz upload do PDF
        const res = await api.uploadFaturaPdf(alerta.fatura_id, file);
        await api.resolveAlerta(alerta.id, `PDF enviado manualmente: ${res.pdf_nome}`);
        alert(`✅ PDF enviado com sucesso!\nArquivo: ${res.pdf_nome}\n\nO alerta foi resolvido automaticamente.`);
      } else {
        // Conta não recebida — cria a fatura manualmente a partir do PDF
        const res = await api.createFaturaManualFromAlerta(alerta.id, file);
        alert(`✅ Fatura cadastrada com sucesso!\nArquivo: ${res.pdf_nome}\n\nO alerta foi resolvido automaticamente.`);
      }

      mutate();
    } catch (err: any) {
      alert('Erro ao enviar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setUploadingAlertId(null);
      pendingAlertRef.current = null;
    }
  };

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
      {/* Input oculto para upload de PDF */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #ea580c 0%, #f97316 55%, #fb923c 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: '0 8px 32px rgba(234,88,12,0.22)',
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
            <AlertCircle size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Central de Alertas</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>
              Gerencie e resolva pendências e anomalias detectadas em faturas pelo sistema.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            padding: '8px 16px', background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
            color: '#fff', fontWeight: 700, fontSize: '0.85rem',
            backdropFilter: 'blur(8px)'
          }}>
            <AlertCircle size={16} style={{ color: '#fff' }} />
            <span>{alertas.length} pendências ativas</span>
          </div>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([label, count]) => {
          const isActive = activeTab === label;
          return (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              style={{
                height: 38, padding: '0 16px', borderRadius: 10,
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                border: `1px solid ${isActive ? '#ea580c' : '#e2e8f0'}`,
                background: isActive ? '#fff7ed' : '#fff',
                color: isActive ? '#ea580c' : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              {label}
              <span style={{
                fontSize: '0.72rem', fontWeight: 800,
                background: isActive ? '#ffedd5' : '#f1f5f9',
                color: isActive ? '#ea580c' : '#475569',
                padding: '2px 8px', borderRadius: 20,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Lista de alertas */}
      <div className="dc-space-y-4">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.map(a => {
          const isUrgent = a.gravidade === 'alta';
          const isResolvingThis = resolving === a.id;
          const isDiscardingThis = discarding === a.id;
          const mostrarUpload = deveMostrarUpload(a);

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
                    {mostrarUpload && (
                      <button
                        className="dc-btn"
                        style={{
                          height: 34, padding: '0 14px', fontSize: '0.8rem', gap: 6,
                          background: '#059669', color: '#fff', border: 'none', borderRadius: 8,
                        }}
                        onClick={() => handleUploadClick(a)}
                        disabled={uploadingAlertId === a.id}
                      >
                        {uploadingAlertId === a.id ? (
                          <><div className="dc-loading-spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} /> Enviando...</>
                        ) : (
                          <><Upload size={14} /> Upload Rápido PDF</>
                        )}
                      </button>
                    )}
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

      {/* Modal de justificativa */}
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
