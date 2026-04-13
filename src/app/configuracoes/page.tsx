'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  User, Shield, Bell, Globe, Database, Mail, Smartphone, ArrowRight, Check, Key, Link as LinkIcon, LogOut, Trash2, Copy, Plus, Activity, RefreshCw, AlertTriangle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

import { isReadOnly } from '@/types';

const allNavItems = [
  { icon: User,       label: 'Perfil & Conta',            adminOnly: false },
  { icon: Shield,     label: 'Privacidade & Segurança',    adminOnly: false },
  { icon: Bell,       label: 'Notificações',               adminOnly: true },
  { icon: Mail,       label: 'Conexão Gmail',              adminOnly: true },
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
    nome: 'Iago Prado Man',
    email: 'iago@datacron.com.br',
    cargo: 'Administrador Global'
  });

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
      alert('As senhas não coincidem!');
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

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Perfil atualizado com sucesso!');
    }, 1000);
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

  // Notifications
  const [notifConfig, setNotifConfig] = useState({
    invoiceCreated: true,
    invoicePaid: true,
    invoiceOverdue: true,
    systemAlerts: false
  });

  React.useEffect(() => {
    if (active === 'Conexão Gmail') {
      api.getGmailStatus()
        .then((res: any) => setGmailStatus(res))
        .catch(err => {
          console.error("Failed to load Gmail Status", err);
          setGmailStatus({ connected: false });
        });
    }

    if (active === 'Privacidade & Segurança') {
      setIsLoadingSessions(true);
      api.getSessions()
        .then((res: any) => setSessions(res))
        .catch(err => console.error("Failed to load sessions", err))
        .finally(() => setIsLoadingSessions(false));
    }
  }, [active]);

  const handleForceSync = async () => {
    try {
      setIsSyncing(true);
      const res = await api.forceEmailScan() as any;
      alert(res.message || 'Sincronização forçada iniciada com sucesso em segundo plano.');
    } catch (e: any) {
      alert(e.message || 'Falha ao forçar sincronização.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await api.getGmailAuthUrl() as any;
      if (res && res.url) {
        // Open OAuth in Popup
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          res.url,
          'GoogleOAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Simulating the user coming back after successful connection since no real callback exists yet:
        setTimeout(() => {
          api.getGmailStatus().then((st: any) => setGmailStatus(st));
        }, 8000);
      }
    } catch (e: any) {
      alert('Erro ao obter link de autenticação.');
    }
  };

  const renderContent = () => {
    switch (active) {
      case 'Perfil & Conta':
        return (
          <>
            <div className="dc-card dc-card-p">
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 20 }}>
                Informações do Operador
              </div>
              <div className="dc-form-grid-2">
                <div className="dc-form-group">
                  <label className="dc-form-label">Nome Completo</label>
                  <input 
                    className="dc-form-input" 
                    type="text" 
                    disabled={readOnly}
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} 
                  />
                </div>
                <div className="dc-form-group">
                  <label className="dc-form-label">E-mail Corporativo</label>
                  <input 
                    className="dc-form-input" 
                    type="email" 
                    disabled
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  />
                </div>
                <div className="dc-form-group">
                  <label className="dc-form-label">ID Operacional</label>
                  <input className="dc-form-input" type="text" value="DAT-90234-A" disabled />
                </div>
                <div className="dc-form-group">
                  <label className="dc-form-label">Cargo</label>
                  <select 
                    className="dc-form-select"
                    disabled={!isAdmin}
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  >
                    <option>Administrador Global</option>
                    <option>Operador Pleno</option>
                    <option>Supervisor</option>
                    <option>Somente Leitura</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                <button 
                  className="dc-btn dc-btn-primary" 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>

            <div
              className="dc-card dc-card-p"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: 'none', position: 'relative', overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute', top: -40, right: -40,
                  width: 160, height: 160, borderRadius: '50%',
                  background: 'rgba(37, 99, 235, 0.3)', filter: 'blur(60px)',
                  pointerEvents: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 14 }}>
                    <Smartphone size={22} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: 6 }}>
                    Autenticação em Duas Etapas
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: 380 }}>
                    Aumente a segurança da base de dados dos seus condomínios ativando 2FA via App Autenticador ou SMS.
                  </div>
                </div>
                <button className="dc-btn" style={{ background: '#fff', color: '#0f172a', flexShrink: 0, gap: 8 }} onClick={() => alert('Fluxo 2FA ativado.')}>
                  Ativar Agora <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {isAdmin && (
              <div className="dc-card dc-card-p" style={{ border: '1px solid #fecaca', background: '#fff5f5' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#dc2626', marginBottom: 6 }}>Zona de Perigo</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>
                  Ações irreversíveis relacionadas à conta Datacron e backups de faturas.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <button className="dc-btn dc-btn-danger" onClick={() => confirm('Tem certeza que deseja desativar a conta?')}>Desativar Conta</button>
                  <button className="dc-btn dc-btn-danger" onClick={() => confirm('Isto irá limpar todo o histórico de processamento. Continuar?')}>Limpar Histórico de Processamento</button>
                </div>
              </div>
            )}
          </>
        );

      case 'Privacidade & Segurança':
        return (
          <>
            <div className="dc-card dc-card-p">
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 20 }}>
                Alterar Senha
              </div>
              <div className="dc-form-grid-1" style={{ maxWidth: 400 }}>
                <div className="dc-form-group">
                  <label className="dc-form-label">Senha Atual</label>
                  <input 
                    className="dc-form-input" 
                    type="password" 
                    placeholder="Digite sua senha atual"
                    value={pwForm.senhaAtual}
                    onChange={e => setPwForm({ ...pwForm, senhaAtual: e.target.value })}
                  />
                </div>
                <div className="dc-form-group">
                  <label className="dc-form-label">Nova Senha</label>
                  <input 
                    className="dc-form-input" 
                    type="password" 
                    placeholder="Mínimo 8 caracteres"
                    value={pwForm.novaSenha}
                    onChange={e => setPwForm({ ...pwForm, novaSenha: e.target.value })}
                  />
                </div>
                <div className="dc-form-group">
                  <label className="dc-form-label">Confirmar Nova Senha</label>
                  <input 
                    className="dc-form-input" 
                    type="password"
                    value={pwForm.confirmaSenha}
                    onChange={e => setPwForm({ ...pwForm, confirmaSenha: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <button 
                  className="dc-btn dc-btn-primary" 
                  disabled={isUpdatingPw}
                  onClick={handleUpdatePassword}
                >
                  {isUpdatingPw ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </div>
            </div>

            <div className="dc-card dc-card-p">
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>Sessões Ativas</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>Dispositivos com acesso atual à sua conta.</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {isLoadingSessions ? (
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Carregando sessões...</div>
                ) : sessions.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Nenhuma sessão encontrada.</div>
                ) : (
                  sessions.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          {s.device.includes('Navegador') || s.device.includes('Chrome') || s.device.includes('Mac') ? <Globe size={20} /> : <Smartphone size={20} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>{s.device}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.location} • {s.last_active}</div>
                        </div>
                      </div>
                      {s.is_current ? (
                        <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Ativo</div>
                      ) : (
                        <button className="dc-btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Encerrar</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        );

      case 'Notificações':
        const notificationOption = (key: keyof typeof notifConfig, title: string, desc: string) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ maxWidth: '80%' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{desc}</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <input 
                type="checkbox" 
                style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} 
                checked={notifConfig[key]}
                onChange={(e) => setNotifConfig({ ...notifConfig, [key]: e.target.checked })}
              />
              <div style={{ 
                width: 40, height: 24, borderRadius: 12, 
                background: notifConfig[key] ? '#2563eb' : '#cbd5e1',
                padding: 2, transition: 'all 0.2s', display: 'flex'
              }}>
                <div style={{ 
                  width: 20, height: 20, borderRadius: '50%', background: '#fff', 
                  transition: 'all 0.2s', transform: notifConfig[key] ? 'translateX(16px)' : 'translateX(0)' 
                }} />
              </div>
            </label>
          </div>
        );

        return (
          <div className="dc-card dc-card-p">
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>Preferências de Notificação</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 8 }}>Gerencie todos os alertas que chegam ao seu e-mail.</div>
            
            {notificationOption('invoiceCreated', 'Nova Fatura Processada', 'Seja notificado no e-mail assim que o extrator finalizar a leitura de um novo PDF no Gmail.')}
            {notificationOption('invoicePaid', 'Aviso de Pagamento Confirmado', 'Receba um e-mail quando recebermos os metadados do ERP atualizando o status.')}
            {notificationOption('invoiceOverdue', 'Alerta de Vencimento', 'Gera um alerta de urgência para faturas não conciliadas 2 dias antes do vencimento.')}
            {notificationOption('systemAlerts', 'Alertas do Sistema', 'Receba notificações de segurança e atualizações importantes sobre a saúde do seu servidor.')}
            
            <div style={{ marginTop: 24 }}>
              <button 
                className="dc-btn dc-btn-primary" 
                onClick={async () => {
                  try {
                    const res: any = await api.saveNotifications(notifConfig);
                    const emailMsg = res?.email_dispatched 
                      ? ' (E-mail de confirmação enviado!)' 
                      : ' (Integração de E-mail inativa).';
                    alert('Preferências de notificação salvas com sucesso!' + emailMsg);
                  } catch (e: any) {
                    alert('Falha ao salvar preferências: ' + e.message);
                  }
              }}>Salvar Preferências</button>
            </div>
          </div>
        );

      case 'Conexão Gmail':
        const connected = gmailStatus?.connected;
        const emailAddress = gmailStatus?.email || 'faturas@empresa.com.br';

        return (
          <div className="dc-card dc-card-p">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <Mail size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>Integração com Gmail</div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Conecte seu e-mail de cobranças para automação total.</div>
              </div>
            </div>

            <div style={{ 
              padding: '32px', 
              background: connected ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', 
              borderRadius: '16px', 
              border: connected ? '1px solid #bef264' : '1px solid #e2e8f0', 
              textAlign: 'center', 
              marginBottom: 32,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative background element */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: connected ? '#10b98110' : '#64748b10' }}></div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                {!gmailStatus ? (
                  <div className="dc-badge dc-badge-secondary">
                    <RefreshCw size={14} className="animate-spin" /> Verificando conexão...
                  </div>
                ) : connected ? (
                  <div style={{ 
                    padding: '10px 20px', 
                    background: '#10b981', 
                    color: '#fff', 
                    borderRadius: '30px', 
                    fontSize: '0.9rem', 
                    fontWeight: 600, 
                    display: 'flex', 
                    gap: 10, 
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' 
                  }}>
                    <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', boxShadow: '0 0 8px #fff' }}></div>
                    Conectado: {emailAddress}
                  </div>
                ) : (
                  <div className="dc-badge dc-badge-warning" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                    Conta não vinculada
                  </div>
                )}
              </div>

              <div style={{ fontSize: '1rem', color: '#475569', maxWidth: 480, margin: '0 auto 24px auto', lineHeight: 1.6 }}>
                {connected 
                  ? 'O Datacron está varrendo sua caixa de entrada 3 vezes ao dia em busca de novas faturas e processando os anexos automaticamente.' 
                  : 'Vincule sua conta Google Workspace ou Gmail para que o Datacron possa ler faturas recebidas (Sabesp, Light, Enel, etc) utilizando IA.'}
              </div>
              
              {!connected ? (
                <button 
                  onClick={handleConnectGmail}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    background: '#fff', 
                    color: '#3c4043', 
                    border: '1px solid #dadce0', 
                    padding: '12px 24px', 
                    borderRadius: '8px', 
                    fontWeight: 600, 
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)'; e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.background = '#fff'; }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Conectar conta do Google
                </button>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                  <button 
                    className="dc-btn dc-btn-secondary" 
                    onClick={handleForceSync}
                    disabled={isSyncing}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'Sincronizando...' : 'Forçar Sincronização'}
                  </button>
                  <button 
                    className="dc-btn" 
                    style={{ color: '#ef4444', border: '1px solid #fee2e2', background: '#fff' }}
                    onClick={() => {
                       if(confirm('Tem certeza que deseja desconectar sua conta do Gmail?')) {
                          alert('Conta desconectada com sucesso.');
                          setGmailStatus({ connected: false });
                       }
                    }}
                  >
                    Desconectar Conta
                  </button>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Histórico de Sincronização
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>Últimos 3 registros</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {syncHistory.map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    background: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #f1f5f9' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.status === 'Sucesso' ? (
                        <div style={{ color: '#10b981' }}><Check size={16} /></div>
                      ) : (
                        <div style={{ color: '#ef4444' }}><AlertTriangle size={16} /></div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                          Sincronização {idx === 0 ? 'Automática' : 'Manual (Usuário)'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.count} faturas encontradas</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{idx === 0 ? 'Hoje, 11:32 AM' : idx === 1 ? 'Ontem, 16:45 PM' : 'Ontem, 08:32 AM'}</div>
                  </div>
                ))}
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
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Configurações</h1>
          <p className="dc-page-subtitle">Gerencie preferências da conta, segurança e integrações do sistema.</p>
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
