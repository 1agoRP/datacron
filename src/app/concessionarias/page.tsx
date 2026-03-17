'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Plus, Building2, Mail, ShieldCheck, Calendar, Zap, ArrowUpRight, X, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

const COLOR_MAP: Record<string, { bg: string; color: string }> = {
  Enel:   { bg: '#eff6ff', color: '#2563eb' },
  Sabesp: { bg: '#ecfeff', color: '#0891b2' },
  Comgás: { bg: '#fff7ed', color: '#ea580c' },
  Outros: { bg: '#f8fafc', color: '#475569' },
};

export default function ConcessionariasPage() {
  const [concs, setConcs] = useState<any[]>([]);
  const [condos, setCondos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Todas');
  const defaultConc = {
    condominio_id: '',
    tipo: 'Enel',
    instalacao: '',
    regra_senha: '5_primeiros_cnpj',
    dia_vencimento: 10,
    email_esperado: '',
    senha_manual: '',
    valor_medio: 0
  };

  const [formConc, setFormConc] = useState<any>({ ...defaultConc });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [concData, condoData] = await Promise.all([
        api.getConcessionarias(),
        api.getCondominios()
      ]);
      setConcs(concData);
      setCondos(condoData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const payload: any = { ...formConc };
      if (!payload.email_esperado || !payload.email_esperado.includes('@')) {
        payload.email_esperado = undefined;
      }
      if (payload.regra_senha !== 'manual') {
        payload.senha_manual = undefined;
      }
      
      if (!payload.valor_medio) payload.valor_medio = 0;

      if (editingId) {
        await api.updateConcessionaria(editingId, payload);
      } else {
        await api.createConcessionaria(payload);
      }
      
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Deseja realmente excluir esta concessionária e todas as suas automações? Ação irreversível!')) return;
    
    try {
      await api.deleteConcessionaria(editingId);
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenCreate = () => {
    setFormConc({ ...defaultConc });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (conc: any) => {
    setFormConc({
      condominio_id: conc.condominio_id,
      tipo: conc.tipo,
      instalacao: conc.instalacao,
      regra_senha: conc.regra_senha,
      dia_vencimento: conc.dia_vencimento,
      email_esperado: conc.email_esperado || '',
      senha_manual: conc.senha_manual || '',
      valor_medio: conc.valor_medio || 0
    });
    setEditingId(conc.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filtered = concs.filter(c => tab === 'Todas' || c.tipo === tab);
  const tabs = ['Todas', 'Enel', 'Sabesp', 'Comgás', 'Outros'];

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Concessionárias</h1>
          <p className="dc-page-subtitle">
            Configure regras de senha, e-mails esperados e vencimentos de cada vinculação.
          </p>
        </div>
        <button className="dc-btn dc-btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Vincular Nova
        </button>
      </div>

      <div className="dc-tabs">
        {tabs.map(t => (
          <button key={t} className={`dc-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="dc-conc-grid">
        {loading ? (
             <div style={{ padding: '40px' }}><div className="dc-loading-spinner" /></div>
        ) : filtered.map(conc => {
          const condo = condos.find(c => c.id === conc.condominio_id);
          const colors = COLOR_MAP[conc.tipo] ?? COLOR_MAP['Outros'];
          return (
            <div key={conc.id} className="dc-conc-card">
              <div className="dc-conc-card-top">
                <div
                  className="dc-conc-type-icon"
                  style={{ background: colors.bg, color: colors.color }}
                >
                  {conc.tipo[0]}
                </div>
                <div className="dc-conc-top-right">
                  <span className="dc-badge dc-badge-green">Ativo</span>
                  <span className="dc-conc-id">ID: {conc.instalacao}</span>
                </div>
              </div>

              <div>
                <div className="dc-conc-title">{condo?.nome || '—'}</div>
                <div className="dc-conc-subtitle">
                  <Building2 size={13} />
                  Nº {condo?.numero} · {conc.tipo}
                </div>
              </div>

              <div>
                <div className="dc-conc-email-row" style={{ marginBottom: 8 }}>
                  <div className="dc-conc-email-label">
                    <Mail size={14} /> E-mail esperado
                  </div>
                  <div className="dc-conc-email-value">{conc.email_esperado || 'Qualquer'}</div>
                </div>
                <div className="dc-conc-email-row" style={{ marginBottom: 8 }}>
                  <div className="dc-conc-email-label">
                    <ShieldCheck size={14} /> Regra de Senha
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                    {conc.regra_senha.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="dc-conc-info-grid">
                  <div className="dc-conc-info-item">
                    <div className="dc-conc-info-label"><Calendar size={12} /> Vencimento</div>
                    <div className="dc-conc-info-value">Dia {conc.dia_vencimento}</div>
                  </div>
                  <div className="dc-conc-info-item">
                    <div className="dc-conc-info-label"><Zap size={12} /> Média Mensal</div>
                    <div className="dc-conc-info-value">R$ {conc.valor_medio.toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>

              <button className="dc-btn dc-btn-dark dc-w-full" style={{ justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); handleOpenEdit(conc); }}>
                Gerenciar Regras <ArrowUpRight size={16} />
              </button>
            </div>
          );
        })}

        {!loading && (
          <div className="dc-conc-add-card" onClick={handleOpenCreate}>
            <div className="dc-conc-add-icon">
              <Plus size={28} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>Vincular Concessionária</div>
            <div style={{ fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.5 }}>
              Clique para associar uma nova concessionária a um condomínio
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 500 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">{editingId ? 'Gerenciar Regras' : 'Vincular Concessionária'}</h2>
              <button className="dc-modal-close" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="dc-modal-body dc-space-y-4">
                <div className="dc-form-group">
                  <label>Condomínio</label>
                  <select 
                    required 
                    value={formConc.condominio_id} 
                    onChange={e => setFormConc({...formConc, condominio_id: e.target.value})}
                    className="dc-input dc-form-select"
                    disabled={!!editingId} // Usually shouldn't change condominio after creation
                  >
                    <option value="">Selecione um condomínio...</option>
                    {condos.map(c => <option key={c.id} value={c.id}>{c.nome} (Nº {c.numero})</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Tipo</label>
                    <select value={formConc.tipo} onChange={e => setFormConc({...formConc, tipo: e.target.value})} className="dc-input dc-form-select">
                      <option value="Enel">Enel</option>
                      <option value="Sabesp">Sabesp</option>
                      <option value="Comgás">Comgás</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="dc-form-group">
                    <label>Instalação / Matrícula</label>
                    <input className="dc-form-input" required value={formConc.instalacao} onChange={e => setFormConc({...formConc, instalacao: e.target.value})} placeholder="Ex: 82736412" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Regra de Senha PDF</label>
                    <select value={formConc.regra_senha} onChange={e => setFormConc({...formConc, regra_senha: e.target.value})} className="dc-input dc-form-select">
                      <option value="5_primeiros_cnpj">5 Primeiros CNPJ (Enel)</option>
                      <option value="3_primeiros_cnpj">3 Primeiros CNPJ (Sabesp/Comgas)</option>
                      <option value="cnpj_completo">CNPJ Completo</option>
                      <option value="manual">Senha Manual</option>
                    </select>
                  </div>
                  <div className="dc-form-group">
                    <label>Dia de Vencimento</label>
                    <input className="dc-form-input" type="number" required value={formConc.dia_vencimento} onChange={e => setFormConc({...formConc, dia_vencimento: parseInt(e.target.value)})} placeholder="Ex: 10" />
                  </div>
                </div>
                {formConc.regra_senha === 'manual' && (
                  <div className="dc-form-group">
                    <label>Senha do PDF (Manual)</label>
                    <input className="dc-form-input" required value={formConc.senha_manual} onChange={e => setFormConc({...formConc, senha_manual: e.target.value})} placeholder="Digite a senha do arquivo" />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>E-mail do Remetente (Opcional)</label>
                    <input className="dc-form-input" value={formConc.email_esperado} onChange={e => setFormConc({...formConc, email_esperado: e.target.value})} placeholder="Ex: fatura@enel.com.br" />
                  </div>
                  <div className="dc-form-group">
                    <label>Valor Médio Mensal (R$)</label>
                    <input className="dc-form-input" type="number" step="0.01" required value={formConc.valor_medio} onChange={e => setFormConc({...formConc, valor_medio: parseFloat(e.target.value) || 0})} placeholder="Ex: 500.50" />
                  </div>
                </div>
              </div>
              
              <div className="dc-modal-footer" style={{ justifyContent: 'space-between' }}>
                {editingId ? (
                  <button type="button" className="dc-btn dc-btn-danger" onClick={handleDelete} style={{ gap: 8 }}>
                    <Trash2 size={15} /> Excluir
                  </button>
                ) : (
                  <div></div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="dc-btn dc-btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                  <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ gap: 10 }}>
                    {creating && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                    {creating ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Confirmar Inclusão'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
