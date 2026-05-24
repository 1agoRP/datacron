'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Building2, Zap, Upload, CheckCircle2,
  AlertCircle, X as XIcon, Download, ChevronLeft, ChevronRight, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ImportacoesPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [baseType, setBaseType] = useState<'condominios' | 'concessionarias' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!baseType) return;
    try {
      setDownloadingTemplate(true);
      await api.downloadTemplate(baseType);
    } catch (err: any) {
      alert('Erro ao baixar modelo: ' + err.message);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!file || !baseType) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', baseType);
      
      const res = await api.previewImport(formData);
      setPreviewData(res);
      setStep(3);
      setLoading(false);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        console.warn('Network error during preview, retrying silently in 2s...');
        setTimeout(() => handlePreview(), 2000);
        return;
      }
      alert(err.message);
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!baseType) return;
    try {
      setLoading(true);
      await api.confirmImport({
        tipo: baseType,
        rows: previewData.rows.filter((r: any) => r.acao !== 'IGNORAR' && r.acao !== 'ERRO')
      });
      alert('Importação concluída com sucesso!');
      router.push(baseType === 'condominios' ? '/condominios' : '/concessionarias');
      setLoading(false);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        console.warn('Network error during confirm import, retrying silently in 2s...');
        setTimeout(() => handleConfirm(), 2000);
        return;
      }
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <Shell>
      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: '0 8px 32px rgba(37,99,235,0.22)',
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
            <Upload size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Importação de Dados</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>
              Sincronize sua base CSV com o Datacron de forma segura e validada.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.8rem', padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#fff', fontWeight: 700, backdropFilter: 'blur(8px)' }}>
            Passo {step} de 3
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="dc-stepper">
        <div className={`dc-stepper-segment${step >= 1 ? ' done' : ''}`} />
        <div className={`dc-stepper-segment${step >= 2 ? ' done' : ''}`} />
        <div className={`dc-stepper-segment${step >= 3 ? ' done' : ''}`} />
      </div>

      {step === 1 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: 20 }}>
            Selecione o tipo de base para importar
          </div>
          <div className="dc-import-options">
            <div
              className={`dc-import-card${baseType === 'condominios' ? ' active' : ''}`}
              onClick={() => setBaseType('condominios')}
            >
              <div className="dc-import-card-icon">
                <Building2 size={28} />
              </div>
              <div>
                <div className="dc-import-card-title">Base de Condomínios</div>
                <div className="dc-import-card-desc">
                  Importar novos condomínios com endereço, CNPJ, síndico e dados cadastrais.
                </div>
              </div>
              <div className="dc-import-check">
                {baseType === 'condominios' ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>

            <div
              className={`dc-import-card${baseType === 'concessionarias' ? ' active' : ''}`}
              onClick={() => setBaseType('concessionarias')}
            >
              <div className="dc-import-card-icon">
                <Zap size={28} />
              </div>
              <div>
                <div className="dc-import-card-title">Base de Concessionárias</div>
                <div className="dc-import-card-desc">
                  Vincular contas de energia, água e gás a condomínios existentes.
                </div>
              </div>
              <div className="dc-import-check">
                {baseType === 'concessionarias' ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>
          </div>

          <div className="dc-step-footer">
            <button
              className="dc-btn dc-btn-primary"
              onClick={() => baseType && setStep(2)}
              disabled={!baseType}
            >
              Continuar <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {/* Template download section */}
          <div className="dc-card" style={{ 
            marginBottom: 24, 
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, 
                  background: '#fff', border: '1px solid #bae6fd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0369a1',
                  flexShrink: 0,
                }}>
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0c4a6e', marginBottom: 3 }}>
                    📋 Baixe o modelo de importação
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#0369a1', lineHeight: 1.5 }}>
                    Use o modelo CSV para preencher os dados no formato correto que o sistema reconhece.
                    {baseType === 'condominios' 
                      ? ' O modelo inclui colunas: Nº Cond., Nome, Endereço, CNPJ, Síndico(a), CPF Síndico.'
                      : ' O modelo inclui colunas: Nº Cond., Tipo, Instalação, E-mail Esperado, Regra Senha, Senha Manual, Dia Vencimento, Valor Médio.'}
                  </div>
                </div>
              </div>
              <button 
                className="dc-btn dc-btn-primary" 
                style={{ flexShrink: 0, height: 40, gap: 8 }}
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? (
                  <>
                    <div className="dc-loading-spinner" style={{width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent'}} />
                    Baixando...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Baixar Modelo (.csv)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="dc-upload-zone">
            <div className="dc-upload-icon">
              {file ? <CheckCircle2 size={36} color="#16a34a" /> : <Upload size={36} />}
            </div>
            <div className="dc-upload-title">{file ? file.name : 'Selecione o arquivo'}</div>
            <div className="dc-upload-subtitle">
              Formatos aceitos: .csv, .xlsx ou .xls. Recomendado usar CSV para melhor compatibilidade.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input type="file" id="import-file" hidden onChange={handleFileChange} accept=".csv,.xlsx,.xls" />
              <button className="dc-btn dc-btn-primary" onClick={() => document.getElementById('import-file')?.click()}>
                Selecionar Arquivo
              </button>
            </div>
          </div>

          <div className="dc-step-footer">
            <button className="dc-btn dc-btn-secondary" onClick={() => setStep(1)}>
               Voltar
            </button>
            <button className="dc-btn dc-btn-primary" onClick={handlePreview} disabled={!file || loading}>
              {loading ? 'Processando...' : 'Simular Importação'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && previewData && (
        <div>
          <div className="dc-card" style={{ overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} /> Prévia da Importação
              </span>
              <span style={{ color: '#93c5fd', fontSize: '0.8rem', fontWeight: 600 }}>
                {previewData.total_linhas} linha(s) · {previewData.criar} a criar · {previewData.atualizar || 0} a atualizar · {previewData.erros || 0} erro(s)
              </span>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="dc-table">
                <thead>
                  <tr>
                    <th>Ação</th>
                    <th>Nome / Info</th>
                    <th>Identificador</th>
                    <th>Validação</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row: any, i: number) => (
                    <tr key={i} style={{ background: row.acao === 'IGNORAR' || row.acao === 'ERRO' ? '#fef2f2' : '#fff' }}>
                      <td>
                        <span style={{ 
                          fontWeight: 800, 
                          color: row.acao === 'CRIAR' ? '#16a34a' : row.acao === 'ATUALIZAR' ? '#d97706' : '#dc2626', 
                          fontSize: '0.82rem' 
                        }}>
                          {row.acao}
                        </span>
                      </td>
                      <td>
                        <span className="dc-cell-primary">
                          {row.dados?.nome || row.dados?.tipo || '—'}
                        </span>
                        {row.mensagem && (
                          <div className="dc-cell-secondary" style={{ color: '#dc2626' }}>{row.mensagem}</div>
                        )}
                      </td>
                      <td>
                        <span className="dc-cell-secondary">
                          {row.dados?.cnpj || row.dados?.['instalação'] || row.dados?.instalacao || '—'}
                        </span>
                      </td>
                      <td>
                        {row.validacao ? <CheckCircle2 size={20} color="#16a34a" /> : <AlertCircle size={20} color="#dc2626" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dc-step-footer">
            <button className="dc-btn dc-btn-secondary" onClick={() => setStep(2)}>
               Voltar
            </button>
            <button className="dc-btn dc-btn-primary" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Importando...' : `Confirmar Importação`}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
