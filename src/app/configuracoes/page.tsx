'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  User, Shield, Globe, Database, Smartphone, LogOut, Activity, Pencil, Lock
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

import { isReadOnly } from '@/types';

const allNavItems = [
  { icon: User,       label: 'Perfil & Conta',            adminOnly: false },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const readOnly = isReadOnly(user);
  const navItems = isAdmin ? allNavItems : allNavItems.filter(i => !i.adminOnly);

  const [active, setActive] = useState('Perfil & Conta');
  const [isSaving, setIsSaving] = useState(false);

  // States for 'Perfil & Conta'
  const [form, setForm] = useState({
    nome: '',
    email: '',
    cargo: '',
    whatsapp: ''
  });

  React.useEffect(() => {
    if (user) {
      setForm({
        nome: user.nome,
        email: user.email,
        cargo: user.role,
        whatsapp: user.whatsapp ? String(user.whatsapp) : ''
      });
    }
  }, [user]);

  const [pwForm, setPwForm] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmaSenha: ''
  });
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);

  const handleUpdatePassword = async () => {
    if (!pwForm.senhaAtual || !pwForm.novaSenha || !pwForm.confirmaSenha) {
      alert('Preencha todos os campos da senha.');
      return;
    }
    if (pwForm.novaSenha !== pwForm.confirmaSenha) {
      alert('As senhas nÃ£o coincidem!');
      return;
    }
    try {
      setIsUpdatingPw(true);
      await api.updatePassword({
        senha_atual: pwForm.senhaAtual,
        nova_senha: pwForm.novaSenha
      });
      alert('Senha atualizada com sucesso!');
      setPwForm({ senhaAtual: '', novaSenha: '', confirmaSenha: '' });
      setIsUpdatingPw(false);
    } catch (e: any) {
      if (e.message && e.message.toLowerCase().includes('failed to fetch')) {
        console.warn('Network error during password update, retrying silently in 2s...');
        setTimeout(() => handleUpdatePassword(), 2000);
        return;
      }
      alert(e.message || 'Falha ao atualizar a senha');
      setIsUpdatingPw(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await api.updateProfile({
        nome: form.nome,
        role: form.cargo,
        whatsapp: form.whatsapp ? parseInt(form.whatsapp.replace(/\D/g, ''), 10) : null
      });
      alert('Perfil atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Falha ao atualizar perfil');
    } finally {
      setIsSaving(true); // Small delay feel
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Status Gmail
  const [gmailStatus, setGmailStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState([
    { date: '10 Out 2024, 08:00', status: 'Sucesso', count: 4 },
    { date: '09 Out 2024, 14:00', status: 'Sucesso', count: 12 },
    { date: '08 Out 2024, 20:00', status: 'Falha', count: 0 },
  ]);

  // Sessoes Ativas
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  React.useEffect(() => {


    if (active === 'Perfil & Conta') {
      setIsLoadingSessions(true);
      api.getSessions()
        .then((res: any) => setSessions(res))
        .catch(err => console.error("Failed to load sessions", err))
        .finally(() => setIsLoadingSessions(false));
    }
  }, [active]);



  const renderContent = () => {
    switch (active) {
      case 'Perfil & Conta':
        return (
          <div className="dc-profile-grid">
            <div className="dc-profile-main dc-space-y-6">
              {/* InformaÃ§Ãµes Pessoais */}
              <div className="dc-card dc-card-p">
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <User size={18} color="#2563eb" /> InformaÃ§Ãµes do Perfil
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="dc-form-group">
                    <label className="dc-form-label">Nome Completo</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        className="dc-form-input" 
                        style={{ width: '100%', paddingRight: '44px', fontWeight: 600 }}
                        type="text" 
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })} 
                      />
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        <Pencil size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="dc-form-group">
                    <label className="dc-form-label">E-mail de Acesso</label>
                    <input 
                      className="dc-form-input" 
                      style={{ width: '100%', background: '#f1f5f9', color: '#64748b' }}
                      type="email" 
                      disabled
                      value={form.email}
                    />
                  </div>

                  <div className="dc-form-group">
                    <label className="dc-form-label">Telefone / WhatsApp</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        className="dc-form-input" 
                        style={{ width: '100%', paddingRight: '44px', ...(isAdmin ? {} : { background: '#f1f5f9', color: '#64748b' }) }}
                        type="text" 
                        placeholder="(00) 00000-0000"
                        disabled={!isAdmin}
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      />
                      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: isAdmin ? '#94a3b8' : '#cbd5e1' }}>
                        {isAdmin ? <Pencil size={16} /> : <Lock size={16} />}
                      </div>
                    </div>
                  </div>

                  <div className="dc-form-group">
                    <label className="dc-form-label">Cargo / FunÃ§Ã£o</label>
                    <input 
                      className="dc-form-input" 
                      style={{ width: '100%', textTransform: 'capitalize', background: '#f1f5f9', color: '#64748b' }}
                      type="text" 
                      disabled
                      value={user?.role || 'Operador'}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                  <button className="dc-btn dc-btn-primary" onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Perfil'}
                  </button>
                </div>
              </div>

              {/* SeguranÃ§a e Senha */}
              <div className="dc-card dc-card-p">
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield size={18} color="#2563eb" /> SeguranÃ§a & Acesso
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                   {/* Coluna de Troca de Senha */}
                   <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 16 }}>ALTERAR SENHA</div>
                      <div className="dc-space-y-4">
                        <div className="dc-form-group">
                          <input 
                            className="dc-form-input" 
                            type="password" 
                            placeholder="Senha atual"
                            value={pwForm.senhaAtual}
                            onChange={e => setPwForm({ ...pwForm, senhaAtual: e.target.value })}
                          />
                        </div>
                        <div className="dc-form-group">
                          <input 
                            className="dc-form-input" 
                            type="password" 
                            placeholder="Nova senha"
                            value={pwForm.novaSenha}
                            onChange={e => setPwForm({ ...pwForm, novaSenha: e.target.value })}
                          />
                        </div>
                        <div className="dc-form-group">
                          <input 
                            className="dc-form-input" 
                            type="password" 
                            placeholder="Confirmar nova senha"
                            value={pwForm.confirmaSenha}
                            onChange={e => setPwForm({ ...pwForm, confirmaSenha: e.target.value })}
                          />
                        </div>
                        <button className="dc-btn dc-btn-dark dc-w-full" onClick={handleUpdatePassword} disabled={isUpdatingPw}>
                          {isUpdatingPw ? 'Atualizando...' : 'Atualizar Minha Senha'}
                        </button>
                      </div>
                   </div>

                   {/* Coluna de Dispositivos */}
                   <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 16 }}>SESSÃ•ES ATIVAS</div>
                      <div className="dc-space-y-3">
                        {sessions.slice(0, 3).map(s => (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '6px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', border: '1px solid #e2e8f0' }}>
                               {s.device.includes('Navegador') ? <Globe size={16} /> : <Smartphone size={16} />}
                            </div>
                            <div className="dc-min-w-0">
                               <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }} className="dc-truncate">{s.device}</div>
                               <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.is_current ? 'Acessando agora' : s.last_active}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>

              {isAdmin && (
                <div style={{ padding: '0 4px', display: 'flex', justifyContent: 'center' }}>
                    <button 
                      className="dc-btn" 
                      style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: 'none', textDecoration: 'underline' }}
                      onClick={() => confirm('Tem certeza que deseja solicitar a desativaÃ§Ã£o desta conta?')}
                    >
                      Deseja encerrar ou desativar sua conta? Clique aqui.
                    </button>
                </div>
              )}
            </div>

            <div className="dc-profile-sidebar">
              {/* Card de Perfil Minimalista */}
              <div className="dc-card" style={{ padding: '32px 24px', textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', zIndex: 0 }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <div style={{ 
                      width: 96, height: 96, borderRadius: '50%', background: '#fff', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb',
                      border: '6px solid #fff', boxShadow: '0 8px 16px rgba(0,0,0,0.08)'
                    }}>
                      <User size={44} />
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', marginBottom: 2 }}>{user?.nome}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {user?.role === 'admin' ? 'Administrador' : user?.role || 'Operador'}
                  </div>
                </div>

                <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                     <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                       <Activity size={16} />
                     </div>
                     <div>
                       <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>CÃ³digo</div>
                       <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>#{user?.codigo_usuario || '1420'}</div>
                     </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                       <Database size={16} />
                     </div>
                     <div className="dc-min-w-0">
                       <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>CondomÃ­nios</div>
                       <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 600 }} className="dc-truncate">
                         {user?.condominios_ids?.join(', ') || 'Acesso a todos'}
                       </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Card de Status Simplificado */}
              <div className="dc-card dc-card-p" style={{ border: '1px solid #ecfdf5', background: '#fff' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px #ecfdf5' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065f46' }}>Conta Protegida</span>
                 </div>
                 <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
                    Seu acesso estÃ¡ verificado e operando sob protocolo AES-256.
                 </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                 <button className="dc-btn" onClick={() => api.logout().then(() => window.location.href = '/login')} style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', gap: 8 }}>
                    <LogOut size={16} /> Sair do Sistema
                 </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
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
            <Shield size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Configurações</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>
              Gerencie preferências da conta, segurança e integrações do sistema.
            </p>
          </div>
        </div>
      </div>

      <div className="dc-settings-layout">
        <nav className="dc-settings-nav">
          {navItems.map(item => (
            <button
              key={item.label}
              className={`dc-settings-nav-item${active === item.label ? ' active' : ''}`}
              onClick={() => setActive(item.label)}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="dc-settings-section">
          {renderContent()}
        </div>
      </div>
    </Shell>
  );
}

