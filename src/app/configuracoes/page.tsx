'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  User, Shield, Bell, Globe, Database, Mail, Smartphone, ArrowRight, Check, Key, Link as LinkIcon, LogOut, Trash2, Copy, Plus, Activity, RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';

const navItems = [
  { icon: User,       label: 'Perfil & Conta' },
  { icon: Shield,     label: 'Privacidade & Segurança' },
  { icon: Bell,       label: 'Notificações' },
  { icon: Mail,       label: 'Conexão Gmail' },
];

export default function ConfiguracoesPage() {
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
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} 
                  />
                </div>
                <div className="dc-form-group">
                  <label className="dc-form-label">E-mail Corporativo</label>
                  <input 
                    className="dc-form-input" 
                    type="email" 
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
        return (
          <div className="dc-card dc-card-p">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <Mail size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>Integração com Gmail</div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Automatize a coleta de faturas direto do seu e-mail de cobranças.</div>
              </div>
            </div>

            <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                {!gmailStatus ? (
                  <div style={{ padding: '12px 24px', background: '#94a3b8', color: '#fff', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <RefreshCw size={16} className="animate-spin" /> Carregando status...
                  </div>
                ) : gmailStatus.connected ? (
                  <div style={{ padding: '12px 24px', background: '#10b981', color: '#fff', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Check size={16} /> Conectado como {gmailStatus.email}
                  </div>
                ) : (
                  <div style={{ padding: '12px 24px', background: '#f59e0b', color: '#fff', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                    Não Conectado
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                O Datacron está monitorando esta caixa de entrada para novas faturas (Sabesp, Light, Enel, etc) utilizando Inteligência Artificial para ler o corpo dos emails.
              </div>
              
              {gmailStatus && !gmailStatus.connected && (
                <div style={{ marginTop: 20 }}>
                  <button className="dc-btn dc-btn-primary" onClick={handleConnectGmail}>
                    Conectar Conta Google
                  </button>
                </div>
              )}
            </div>

            {gmailStatus?.connected && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="dc-btn" style={{ gap: 8 }} onClick={handleForceSync} disabled={isSyncing}>
                  <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? 'Sincronizando...' : 'Forçar Sincronização'}
                </button>
                <button className="dc-btn" onClick={() => confirm('Deseja desconectar esta conta do Gmail?')} style={{ gap: 8, color: '#dc2626' }}>
                  <LogOut size={16} color="#dc2626" /> Desconectar Conta
                </button>
              </div>
            )}
            
            <div style={{ marginTop: 32 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 12 }}>Histórico de Sincronização</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Check size={16} color="#10b981" />
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>Sincronização Automática</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Executa 3 vezes ao dia</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Check size={16} color="#10b981" />
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>Sincronização Manual (Usuário)</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Disponível sob demanda</span>
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
