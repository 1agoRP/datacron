'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Plus, Search, Filter, Building2, MapPin, ExternalLink, MoreVertical, X, Zap, LayoutDashboard, Mail, Trash2, Calendar, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export default function CondominiosPage() {
  const [condos, setCondos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCondo, setNewCondo] = useState({
    nome: '',
    numero: '',
    endereco: '',
    cnpj: '',
    sindico: '',
    cpf_sindico: ''
  });
  const [creating, setCreating] = useState(false);

  // Modals state
  const [detailsCondo, setDetailsCondo] = useState<any>(null);
  const [editCondo, setEditCondo] = useState<any>(null);
  const [condoConcs, setCondoConcs] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.getCondominios();
      setCondos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.createCondominio(newCondo);
      setIsModalOpen(false);
      setNewCondo({ nome: '', numero: '', endereco: '', cnpj: '', sindico: '', cpf_sindico: '' });
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = condos.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.numero.includes(searchTerm) ||
    c.cnpj.includes(searchTerm)
  );

  const handleOpenDetails = async (condo: any) => {
    setDetailsCondo(condo);
    try {
      setLoadingDetails(true);
      const concs = await api.getConcessionarias({ condominio_id: condo.id });
      setCondoConcs(concs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenEdit = (condo: any) => {
    setEditCondo({ ...condo });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await api.updateCondominio(editCondo.id, {
        nome: editCondo.nome,
        endereco: editCondo.endereco,
        sindico: editCondo.sindico,
        cpf_sindico: editCondo.cpf_sindico,
      });
      setEditCondo(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este condomínio? Ação irreversível!')) return;
    try {
      await api.deleteCondominio(id);
      setEditCondo(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Condomínios</h1>
          <p className="dc-page-subtitle">Gerencie sua base de clientes e acompanhe o status de cada unidade.</p>
        </div>
        <button className="dc-btn dc-btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Adicionar Condomínio
        </button>
      </div>

      {/* Filter bar */}
      <div className="dc-filter-bar">
        <div className="dc-filter-search">
          <Search />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, número ou CNPJ..."
          />
        </div>
        <button className="dc-btn dc-btn-secondary" style={{ height: 40, padding: '0 16px', fontSize: '0.85rem' }}>
          <Filter size={15} /> Filtros
        </button>
        <div className="dc-filter-divider" />
        <span className="dc-filter-count">
          {filtered.length} condomínio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="dc-card">
        <div className="dc-table-wrapper">
          <table className="dc-table">
            <thead>
              <tr>
                <th>Condomínio</th>
                <th>Status de Contas</th>
                <th>Síndico(a) / CNPJ</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.map(condo => {
                const total = condo.contas_esperadas || 0;
                const rec = condo.contas_recebidas || 0;
                const pct = total > 0 ? Math.round((rec / total) * 100) : 0;
                return (
                  <tr key={condo.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div className="dc-condo-icon">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div className="dc-cell-primary">{condo.nome}</div>
                          <div className="dc-cell-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontWeight: 800, color: '#94a3b8' }}>Nº {condo.numero}</span>
                            <span style={{ margin: '0 4px', color: '#cbd5e1' }}>·</span>
                            <MapPin size={11} style={{ color: '#94a3b8' }} />
                            {condo.endereco}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-progress-bar-wrap">
                        <div className="dc-progress-bar-labels">
                          <span className="dc-progress-bar-label">{rec}/{total} contas</span>
                          <span className="dc-progress-bar-pct">{pct}%</span>
                        </div>
                        <div className="dc-progress-track">
                          <div className="dc-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{condo.sindico}</div>
                      <div className="dc-cell-secondary">{condo.cnpj}</div>
                    </td>
                    <td>
                      <div className="dc-row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="dc-icon-action" title="Abrir detalhes" onClick={() => handleOpenDetails(condo)}><ExternalLink size={15} /></button>
                        <button className="dc-icon-action" title="Mais opções" onClick={() => handleOpenEdit(condo)}><MoreVertical size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>Nenhum condomínio cadastrado</div>
                      <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Comece adicionando seu primeiro cliente.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simplified Pagination */}
      <div className="dc-pagination">
        <span className="dc-pagination-info">
          Mostrando {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Modal Adicionar */}
      {isModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 500 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Novo Condomínio</h2>
              <button className="dc-modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="dc-modal-body dc-space-y-4">
              <div className="dc-form-group">
                <label>Nome do Condomínio</label>
                <input required value={newCondo.nome} onChange={e => setNewCondo({...newCondo, nome: e.target.value})} placeholder="Ex: Edifício Horizonte" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Número/ID</label>
                  <input required value={newCondo.numero} onChange={e => setNewCondo({...newCondo, numero: e.target.value})} placeholder="Ex: 101" />
                </div>
                <div className="dc-form-group">
                  <label>CNPJ</label>
                  <input required value={newCondo.cnpj} onChange={e => setNewCondo({...newCondo, cnpj: e.target.value})} placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="dc-form-group">
                <label>Endereço Completo</label>
                <input required value={newCondo.endereco} onChange={e => setNewCondo({...newCondo, endereco: e.target.value})} placeholder="Rua, Número, Bairro, Cidade - UF" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Nome do Síndico</label>
                  <input required value={newCondo.sindico} onChange={e => setNewCondo({...newCondo, sindico: e.target.value})} placeholder="Nome completo" />
                </div>
                <div className="dc-form-group">
                  <label>CPF do Síndico</label>
                  <input value={newCondo.cpf_sindico} onChange={e => setNewCondo({...newCondo, cpf_sindico: e.target.value})} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="dc-modal-footer">
                <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ gap: 10 }}>
                  {creating && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                  {creating ? 'Criando...' : 'Criar Condomínio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editCondo && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 500 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Editar Condomínio</h2>
              <button className="dc-modal-close" onClick={() => setEditCondo(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="dc-modal-body dc-space-y-4">
              <div className="dc-form-group">
                <label>Nome do Condomínio</label>
                <input required value={editCondo.nome} onChange={e => setEditCondo({...editCondo, nome: e.target.value})} className="dc-form-input" />
              </div>
              <div className="dc-form-group">
                <label>Endereço Completo</label>
                <input required value={editCondo.endereco} onChange={e => setEditCondo({...editCondo, endereco: e.target.value})} className="dc-form-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Nome do Síndico</label>
                  <input required value={editCondo.sindico} onChange={e => setEditCondo({...editCondo, sindico: e.target.value})} className="dc-form-input" />
                </div>
                <div className="dc-form-group">
                  <label>CPF do Síndico</label>
                  <input value={editCondo.cpf_sindico || ''} onChange={e => setEditCondo({...editCondo, cpf_sindico: e.target.value})} className="dc-form-input" />
                </div>
              </div>
              
              <div className="dc-modal-footer" style={{ justifyContent: 'space-between', padding: '16px 0 0 0', marginTop: 10 }}>
                <button type="button" className="dc-btn dc-btn-danger" style={{ gap: 8 }} onClick={() => handleDelete(editCondo.id)}>
                  <Trash2 size={15} /> Excluir
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setEditCondo(null)}>Cancelar</button>
                  <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ minWidth: 140 }}>
                    {creating ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {detailsCondo && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 650 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Detalhes do Condomínio</h2>
              <button className="dc-modal-close" onClick={() => setDetailsCondo(null)}><X size={20} /></button>
            </div>
            <div className="dc-modal-body dc-space-y-4">
              {/* Info Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div className="dc-condo-icon" style={{ width: 48, height: 48 }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{detailsCondo.nome}</h3>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                    <span>Cód: Nº {detailsCondo.numero}</span>
                    <span>CNPJ: {detailsCondo.cnpj}</span>
                  </div>
                </div>
              </div>

              {/* Specifics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>SÍNDICO(A) RESPONSÁVEL</div>
                  <div style={{ fontWeight: 600, color: '#334155' }}>{detailsCondo.sindico}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>ENDEREÇO</div>
                  <div style={{ fontWeight: 600, color: '#334155' }}>{detailsCondo.endereco}</div>
                </div>
              </div>

              {/* Concessionarias List */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={16} color="#eab308" /> Concessionárias Vinculadas
                </h4>
                {loadingDetails ? (
                   <div style={{ padding: '20px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
                ) : condoConcs.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, fontSize: '0.9rem', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                    Este condomínio ainda não possui automações vinculadas.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {condoConcs.map(conc => (
                      <div key={conc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 8, background: conc.tipo === 'Sabesp' ? '#ecfeff' : conc.tipo === 'Enel' ? '#eff6ff' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: conc.tipo === 'Sabesp' ? '#0891b2' : conc.tipo === 'Enel' ? '#2563eb' : '#ea580c' }}>
                            {conc.tipo[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{conc.tipo}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Instalação: {conc.instalacao}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="dc-badge dc-badge-green">Ativo</span>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <Calendar size={13} /> Vence dia {conc.dia_vencimento}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="dc-modal-footer">
              <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setDetailsCondo(null)}>Fechar Visualização</button>
            </div>
          </div>
        </div>
      )}

    </Shell>
  );
}
