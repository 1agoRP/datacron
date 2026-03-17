'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Building2, Zap, Mail, FileText,
  AlertCircle, Download, ChevronLeft, ChevronRight,
  Search, Layers, BarChart2, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import '@/styles/app.css';

const nav = [
  { href: '/dashboard',      icon: BarChart3,    label: 'Dashboard' },
  { href: '/condominios',    icon: Building2,    label: 'Condomínios' },
  { href: '/concessionarias',icon: Zap,          label: 'Concessionárias' },
  { href: '/recebimentos',   icon: Mail,         label: 'Recebimentos' },
  { href: '/faturas',        icon: FileText,     label: 'Faturas' },
  { href: '/alertas',        icon: AlertCircle,  label: 'Alertas' },
  { href: '/relatorios',     icon: BarChart2,    label: 'Relatórios' },
  { href: '/importacoes',    icon: Download,     label: 'Importações' },
  { href: '/configuracoes',  icon: Settings,     label: 'Configurações' },
];

interface ShellProps {
  children: React.ReactNode;
  showSearch?: boolean;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
}

export default function Shell({ children, showSearch = false, searchTerm = '', onSearchChange }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="dc-app">
      {/* Sidebar */}
      <aside className={`dc-sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* Logo */}
        <div className="dc-sidebar-logo">
          <div className="dc-sidebar-logo-icon">
            <Layers size={20} />
          </div>
          {!collapsed && <span className="dc-sidebar-logo-name">Datacron</span>}
        </div>

        {/* Nav */}
        <nav className="dc-sidebar-nav">
          {nav.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dc-nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!collapsed && <span className="dc-nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="dc-sidebar-footer">
          <div className="dc-user-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: collapsed ? 0 : '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="dc-user-avatar">{user?.nome ? user.nome.substring(0,2).toUpperCase() : 'IP'}</div>
              {!collapsed && (
                <div className="dc-user-text">
                  <div className="dc-user-name">{user?.nome || 'Usuário'}</div>
                  <div className="dc-user-role">Administrador</div>
                </div>
              )}
            </div>
            {!collapsed && (
              <button 
                onClick={logout}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                title="Sair do sistema"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
          <button
            className="dc-toggle-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`dc-main${collapsed ? ' collapsed' : ''}`}>
        {/* Topbar */}
        <header className="dc-topbar" style={{ justifyContent: 'center', minHeight: 68 }}>
          {showSearch && (
            <div className="dc-search-wrapper" style={{ margin: '0 auto', width: '100%', maxWidth: 500 }}>
              <Search className="dc-search-icon" />
              <input
                className="dc-search-input"
                type="text"
                placeholder="Pesquisar acesso rápido a áreas do sistema..."
                value={searchTerm}
                onChange={e => onSearchChange && onSearchChange(e.target.value)}
              />
            </div>
          )}
        </header>

        {/* Page Content */}
        <div className="dc-content">
          {children}
        </div>
      </main>
    </div>
  );
}
