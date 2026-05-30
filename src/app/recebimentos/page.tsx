'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Mail, Search, Filter, CheckCircle2, AlertCircle,
  ShieldCheck, FileCheck, Activity, Layers,
  Download, FileDigit, FileText
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function RecebimentosPage() {
  // SWR for logs and status — automatic cache + background revalidation
  const { data: logs = [], isLoading: loading } = useSWR(
    'emailLogs',
    () => api.getEmailLogs() as Promise<any[]>,
    { revalidateOnFocus: true }
  );
  const { data: status } = useSWR<any>(
    'emailStatus',
    () => api.getAgentStatus(),
    { revalidateOnFocus: true }
  );
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data: inboxData } = useSWR(
    'inboxCount',
    () => api.getInboxCount(),
    { revalidateOnFocus: true }
  );

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Shell>
      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: '0 8px 32px rgba(15,23,42,0.18)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            flexShrink: 0,
          }}>
            <Mail size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Central de Recebimento</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>
              Faturas processadas automaticamente pelo Agente FOX e prontas para exportação.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="dc-stats-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {/* Card 1: Inbox */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #2563eb',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Mail size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>INBOX</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-mails na inbox</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{inboxData?.inbox_count ?? '—'}</div>
          </div>
        </div>

        {/* Card 2: Faturas */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #16a34a',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <FileCheck size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>SUCESSO</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Faturas Processadas</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{logs.length}</div>
          </div>
        </div>

        {/* Card 3: PDFs Desbloqueados */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #9333ea',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
              <FileText size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9333ea', background: '#faf5ff', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>PDFS</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PDFs Desbloqueados</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>
              {logs.filter(l => l.fatura_desbloqueada).length}
            </div>
          </div>
        </div>

        {/* Card 4: Valor Processado */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #ea580c',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <Activity size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', background: '#fff7ed', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>VALOR</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor Processado</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.2, marginTop: 8 }}>
              {formatCurrency(logs.reduce((sum, l) => sum + (l.fatura_valor || 0), 0))}
            </div>
          </div>
        </div>

        {/* Card 5: Cron Job */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #0891b2',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
              <ShieldCheck size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0891b2', background: '#ecfeff', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>CRON</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próxima Varredura</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>
              {status?.jobs?.[0]?.next_run ? format(new Date(status.jobs[0].next_run), "HH:mm") : 'Em breve'}
            </div>
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
            placeholder="Buscar por remetente, assunto ou condomínio..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>

      {/* Processing feed */}
      <div className="dc-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
            Atividade Recente
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            Agente {status?.ativo ? 'Online' : 'Aguardando'} · 100% Operacional
          </span>
        </div>

        {loading ? (
             <div style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
        ) : logs.filter(item => {
          if (!searchTerm.trim()) return true;
          const q = searchTerm.toLowerCase();
          return (
            (item.remetente || '').toLowerCase().includes(q) ||
            (item.assunto || '').toLowerCase().includes(q) ||
            (item.condominio_nome || '').toLowerCase().includes(q) ||
            (item.codigo_identificacao || '').toLowerCase().includes(q)
          );
        }).map(item => (
          <div key={item.id} className="dc-processing-item">
            {/* Sender column */}
            <div className="dc-proc-sender-col">
              <div className="dc-proc-sender-row">
                <div className={`dc-proc-status-icon ${item.status}`}>
                  {item.status === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="dc-proc-sender-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <div className="dc-proc-dest-label">E-mail</div>
                  </div>
                  <div className="dc-proc-sender-name" title={item.remetente}>{item.remetente}</div>
                  <div className="dc-proc-sender-time" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ color: '#475569', fontSize: '0.75rem' }}>
                      {item.recebido_em ? format(new Date(item.recebido_em), "dd/MM HH:mm") : '—'}
                    </span>
                    {item.codigo_identificacao && (
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, color: '#0f172a', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #e2e8f0' }}>
                        <FileDigit size={12} /> CÓDIGO {item.codigo_identificacao}
                      </span>
                    )}
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                      ID: {item.gmail_message_id.substring(0, 10)}...
                    </span>
                  </div>
                  
                  {/* Códigos Extraídos do Corpo */}
                  {(item.dados_extraidos?.instalacao || item.dados_extraidos?.num_cliente) && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {item.dados_extraidos?.instalacao && (
                        <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 800, background: '#f0f9ff', border: '1px solid #bae6fd', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                          <span style={{ color: '#0369a1' }}>N° DA INSTALAÇÃO/UC:</span> {item.dados_extraidos.instalacao}
                        </div>
                      )}
                      {item.dados_extraidos?.num_cliente && (
                        <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 800, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                          <span style={{ color: '#15803d' }}>N° DO CLIENTE:</span> {item.dados_extraidos.num_cliente}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="dc-proc-subject" style={{ fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginTop: 8, fontStyle: 'italic' }}>
                "{item.assunto}"
              </div>
            </div>

            {/* Body column */}
            <div className="dc-proc-body">
              <div className="dc-proc-dest-label">Condomínio</div>
              <div className="dc-proc-dest-name">
                {item.condominio_nome ? (
                  <><Layers size={15} style={{ color: '#2563eb' }} /> {item.condominio_nome}</>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626' }}>
                    <AlertCircle size={15} /> 
                    <span style={{ fontWeight: 800 }}>Aguardando Vinculação</span>
                  </div>
                )}
              </div>
              <div className="dc-proc-steps" style={{ flexWrap: 'wrap' }}>
                  <span className={`dc-proc-step ${item.status === 'erro' || item.status === 'nao_identificado' ? 'error' : 'done'}`}>
                    {item.status === 'processado' || item.status === 'identificado' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {item.status === 'erro' ? (item.erro_msg || 'Falha no processamento') : 
                     item.status === 'processado' ? 'Dados extraídos com sucesso' : 
                     item.status === 'identificado' ? 'Condomínio vinculado' : 
                     item.status === 'nao_identificado' ? 'Não identificado' : 'Processando...'}
                  </span>
                  {item.fatura_valor !== null && item.fatura_valor !== undefined && item.fatura_valor > 0 && (
                    <span className="dc-proc-step done" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
                      💰 {formatCurrency(item.fatura_valor)}
                    </span>
                  )}
                  {item.fatura_vencimento && (
                    <span className="dc-proc-step done" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
                      📅 Venc: {new Date(item.fatura_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
              </div>
            </div>

            {/* Action Area */}
            <div className="dc-proc-action-area" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {item.fatura_url ? (
                <button 
                  className="dc-btn dc-btn-light"
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.8rem', 
                    fontWeight: 700,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: item.fatura_desbloqueada ? '#f0fdf4' : '#f8fafc',
                    color: item.fatura_desbloqueada ? '#16a34a' : '#475569',
                    border: `1px solid ${item.fatura_desbloqueada ? '#bbf7d0' : '#e2e8f0'}`,
                  }}
                  onClick={() => {
                    fetch(`${API_BASE_URL}${item.fatura_url.replace('/api', '')}`, {
                        credentials: 'include'
                    }).then(resp => {
                        if (!resp.ok) throw new Error('PDF não encontrado');
                        return resp.blob();
                    }).then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `fatura_${item.codigo_identificacao || 'extracao'}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }).catch(err => alert('Erro no download: ' + err.message));
                  }}
                >
                  <Download size={14} />
                  {item.fatura_desbloqueada ? 'Baixar Desbloqueada' : 'Baixar Original'}
                </button>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  Fatura Indisponível
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && logs.length === 0 && (
             <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                Nenhuma fatura processada encontrada na sua carteira.
             </div>
        )}
      </div>
    </Shell>
  );
}
