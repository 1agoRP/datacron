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
  { icon: Globe,      label: 'Domínio Datacron' },
  { icon: Database,   label: 'Integração de Base' },
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Windows 11 (Datacron App)</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>São Paulo, BR • Sessão Atual</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Ativo</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Chrome (Mac OS)</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Rio de Janeiro, BR • Há 2 dias</div>
                    </div>
                  </div>
                  <button className="dc-btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Encerrar</button>
                </div>
              </div>
            </div>
          </>
        );

      case 'Notificações':
        const notificationOption = (title: string, desc: string, defaultChecked = true) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ paddingRight: 20 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#334155', marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{desc}</div>
            </div>
            <input type="checkbox" defaultChecked={defaultChecked} style={{ width: 18, height: 18, accentColor: '#2563eb', marginTop: 4 }} />
          </div>
        );

        return (
          <div className="dc-card dc-card-p">
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>Preferências de Notificação</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>Escolha como e quando você deseja ser alertado pelo Datacron.</div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notificationOption('Resumo Semanal', 'Receba um relatório semanal com o processamento de faturas.', true)}
              {notificationOption('Fatores Críticos e Alertas', 'Seja notificado imediatamente se houver falha de leitura ou webhook.', true)}
              {notificationOption('Condomínios Novos', 'Alerta quando novos condomínios forem cadastrados na base.', false)}
              {notificationOption('Atualizações Datacron', 'Novidades e atualizações sobre o sistema Datacron.', false)}
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="dc-btn dc-btn-primary" onClick={() => alert('Preferências salvas!')}>Salvar Preferências</button>
            </div>
          </div>
        );

      case 'Domínio Datacron':
        return (
          <div className="dc-card dc-card-p">
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>Configurar Domínio Personalizado</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>Acesse sua área através do seu próprio domínio (ex: portal.suaempresa.com.br).</div>
            
            <div className="dc-form-group" style={{ maxWidth: 400 }}>
              <label className="dc-form-label">Domínio</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="dc-form-input" type="text" placeholder="portal.empresa.com.br" />
                <button className="dc-btn dc-btn-primary" onClick={() => alert('Verificação iniciada. Aguarde a propagação DNS.')}>Verificar</button>
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155', marginBottom: 8 }}>Instruções de DNS</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                1. Acesse o seu provedor de domínio (HostGator, Registro.br, etc).<br />
                2. Crie um registro do tipo <strong>CNAME</strong> apontando para <code>cname.datacron.com.br</code>.<br />
                3. A propagação pode levar até 24 horas.
              </div>
            </div>
          </div>
        );

      case 'Integração de Base':
        return (
          <>
            <div className="dc-card dc-card-p">
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>Chaves de API</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>Conecte o ERP da sua administradora com o Datacron via API.</div>
              
              <div style={{ padding: '16px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Chave de Produção</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: 1, marginTop: 4 }}>sk_live_*************************</div>
                </div>
                <button className="dc-btn" style={{ gap: 6 }} onClick={() => alert('Chave copiada para a área de transferência.')}>
                  <Copy size={14} /> Copiar
                </button>
              </div>

              <button className="dc-btn" style={{ gap: 6, color: '#2563eb' }}>
                <RefreshCw size={14} /> Gerar Nova Chave
              </button>
            </div>

            <div className="dc-card dc-card-p">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 6 }}>Webhooks Ativos</div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Receba eventos em tempo real no seu sistema.</div>
                </div>
                <button className="dc-btn dc-btn-primary" style={{ gap: 6 }} onClick={() => alert('Fluxo para adicionar webhook seria aberto aqui.')}>
                  <Plus size={16} /> Novo Webhook
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>https://api.empresa.com.br/hooks/datacron</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', gap: 8, display: 'flex' }}>
                      <span>Eventos: invoice.created, invoice.paid</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="dc-btn" onClick={() => alert('Testar webhook...')}>Testar</button>
                  <button className="dc-btn dc-btn-danger" style={{ background: 'transparent', padding: '8px' }} onClick={() => confirm('Remover webhook?')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </>
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
                <div style={{ padding: '12px 24px', background: '#10b981', color: '#fff', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Check size={16} /> Conectado como faturas@empresa.com.br
                </div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                O Datacron está monitorando esta caixa de entrada para novas faturas (Sabesp, Light, Enel, etc) utilizando Inteligência Artificial para ler o corpo dos emails.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="dc-btn" style={{ gap: 8 }} onClick={() => alert('Sincronização forçada iniciada.')}>
                <RefreshCw size={16} /> Forçar Sincronização
              </button>
              <button className="dc-btn" onClick={() => confirm('Deseja desconectar esta conta do Gmail?')} style={{ gap: 8, color: '#dc2626' }}>
                <LogOut size={16} color="#dc2626" /> Desconectar Conta
              </button>
            </div>
            
            <div style={{ marginTop: 32 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 12 }}>Histórico de Sincronização</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Check size={16} color="#10b981" />
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>Sincronização Automática</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Hoje, 11:32 AM</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Check size={16} color="#10b981" />
                        <span style={{ fontSize: '0.875rem', color: '#334155' }}>Sincronização Manual (Usuário)</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Ontem, 16:45 PM</span>
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
