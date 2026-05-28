import uuid
from datetime import datetime, date
from typing import Optional, Any, Literal

from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ─── Auth ────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class UserInToken(BaseModel):
    id: str
    nome: str
    email: str
    role: str
    administradora: Optional[str] = None
    codigo_usuario: Optional[int] = None
    condominios_ids: list[str] = []
    codigo_condominio: Optional[str] = None
    whatsapp: Optional[int] = None
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInToken


class UserResponse(BaseModel):
    id: uuid.UUID
    nome: str
    email: str
    role: str
    administradora: Optional[str] = None
    codigo_usuario: Optional[int] = None
    created_at: datetime
    condominios_ids: list[str] = []
    codigo_condominio: Optional[str] = None
    model_config = {"from_attributes": True}


class PasswordUpdate(BaseModel):
    senha_atual: str
    nova_senha: str


# ─── Condomínio ───────────────────────────────────────────────


class CondominioCreate(BaseModel):
    nome: str
    numero: str
    endereco: str
    cnpj: str
    sindico: str
    cpf_sindico: Optional[str] = None
    administradora: Optional[str] = None
    carteira: Optional[int] = None
    gerente_id: Optional[int] = None
    assistente_id: Optional[int] = None
    mandato_inicio: Optional[datetime] = None
    mandato_fim: Optional[datetime] = None
    leitura_individualizada_ativa: Optional[bool] = False

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, v: str) -> str:
        digits = "".join(filter(str.isdigit, v))
        if len(digits) != 14:
            raise ValueError("CNPJ deve ter 14 dígitos")

        # Validar primeiro e segundo dígitos verificadores
        for i in range(12, 14):
            fator = i - 7
            soma = 0
            for k in range(i):
                soma += int(digits[k]) * fator
                fator -= 1
                if fator < 2:
                    fator = 9
            resultado = 11 - (soma % 11)
            digito_esperado = 0 if resultado >= 10 else resultado
            if digito_esperado != int(digits[i]):
                raise ValueError("CNPJ inválido (dígito verificador incorreto)")

        return digits

    @field_validator("cpf_sindico")
    @classmethod
    def normalize_cpf(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        digits = "".join(filter(str.isdigit, v))
        return digits or None


class CondominioUpdate(BaseModel):
    nome: Optional[str] = None
    numero: Optional[str] = None
    endereco: Optional[str] = None
    cnpj: Optional[str] = None
    sindico: Optional[str] = None
    cpf_sindico: Optional[str] = None
    administradora: Optional[str] = None
    carteira: Optional[int] = None
    gerente_id: Optional[int] = None
    assistente_id: Optional[int] = None
    mandato_inicio: Optional[datetime] = None
    mandato_fim: Optional[datetime] = None
    leitura_individualizada_ativa: Optional[bool] = None
    ata_eleicao_nome: Optional[str] = None
    ata_eleicao_inicio: Optional[datetime] = None
    ata_eleicao_fim: Optional[datetime] = None
    avcb_url: Optional[str] = None
    avcb_inicio: Optional[datetime] = None
    avcb_fim: Optional[datetime] = None
    apolice_seguro_url: Optional[str] = None
    apolice_seguro_inicio: Optional[datetime] = None
    apolice_seguro_fim: Optional[datetime] = None
    ativo: Optional[bool] = None

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj_update(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        return CondominioCreate.validate_cnpj(v)

    @field_validator("cpf_sindico")
    @classmethod
    def normalize_cpf_update(cls, v: Optional[str]) -> Optional[str]:
        return CondominioCreate.normalize_cpf(v)


class CondominioResponse(BaseModel):
    id: uuid.UUID
    nome: str
    numero: str
    endereco: str
    cnpj: str
    sindico: str
    cpf_sindico: Optional[str]
    administradora: Optional[str] = None
    carteira: Optional[int] = None
    gerente_id: Optional[int] = None
    assistente_id: Optional[int] = None
    mandato_inicio: Optional[datetime] = None
    mandato_fim: Optional[datetime] = None
    leitura_individualizada_ativa: bool = False
    ata_eleicao_nome: Optional[str] = None
    ata_eleicao_inicio: Optional[datetime] = None
    ata_eleicao_fim: Optional[datetime] = None
    avcb_url: Optional[str] = None
    avcb_inicio: Optional[datetime] = None
    avcb_fim: Optional[datetime] = None
    apolice_seguro_url: Optional[str] = None
    apolice_seguro_inicio: Optional[datetime] = None
    apolice_seguro_fim: Optional[datetime] = None
    ativo: bool
    created_at: datetime
    updated_at: datetime
    # computed
    contas_esperadas: int = 0
    contas_recebidas: int = 0
    model_config = {"from_attributes": True}


# ─── Concessionária ───────────────────────────────────────────


class ConcessionariaCreate(BaseModel):
    condominio_id: uuid.UUID
    tipo: str  # Enel | Sabesp | Comgás | Claro | Vivo | TIM | Outros
    instalacao: str
    email_esperado: Optional[EmailStr] = None
    regra_senha: str = "5_primeiros_cnpj"
    senha_manual: Optional[str] = None
    dia_vencimento: int
    valor_medio: float = 0.0
    nome_personalizado: Optional[str] = None
    leitura_individualizada: bool = False
    debito_automatico: bool = True
    senha_portal: Optional[str] = None
    email_emissao: Optional[str] = None


class ConcessionariaUpdate(BaseModel):
    tipo: Optional[str] = None
    email_esperado: Optional[EmailStr] = None
    regra_senha: Optional[str] = None
    senha_manual: Optional[str] = None
    dia_vencimento: Optional[int] = None
    valor_medio: Optional[float] = None
    nome_personalizado: Optional[str] = None
    leitura_individualizada: Optional[bool] = None
    debito_automatico: Optional[bool] = None
    senha_portal: Optional[str] = None
    email_emissao: Optional[str] = None
    instalacao: Optional[str] = None
    ativo: Optional[bool] = None


class CondominioMini(BaseModel):
    """Minimal condominio data for nested responses."""

    id: uuid.UUID
    nome: str
    numero: str
    cnpj: str
    model_config = {"from_attributes": True}


class ConcessionariaMini(BaseModel):
    """Minimal concessionaria data for nested responses."""
    id: uuid.UUID
    tipo: str
    instalacao: str
    model_config = {"from_attributes": True}


class ConcessionariaResponse(BaseModel):

    id: uuid.UUID
    condominio_id: uuid.UUID
    tipo: str
    instalacao: str
    email_esperado: Optional[str] = None
    regra_senha: str
    senha_manual: Optional[str] = None
    dia_vencimento: int
    valor_medio: float
    nome_personalizado: Optional[str] = None
    leitura_individualizada: bool = False
    debito_automatico: bool = True
    senha_portal: Optional[str] = None
    email_emissao: Optional[str] = None
    created_by_id: Optional[uuid.UUID] = None
    ativo: bool
    created_at: datetime
    condominio: Optional[CondominioMini] = None
    model_config = {"from_attributes": True}


# ─── Fatura ───────────────────────────────────────────────────


class FaturaCreate(BaseModel):
    condominio_id: uuid.UUID
    concessionaria_id: uuid.UUID
    referencia: str
    valor: float
    vencimento: Optional[date] = None
    email_remetente: Optional[str] = None
    email_assunto: Optional[str] = None


class FaturaStatusUpdate(BaseModel):
    status: str  # pendente | processada | erro | revisao


class FaturaResponse(BaseModel):
    id: uuid.UUID
    condominio_id: Optional[uuid.UUID] = None
    concessionaria_id: Optional[uuid.UUID] = None
    referencia: str
    valor: float
    vencimento: Optional[date]
    status: str
    email_remetente: Optional[str]
    email_assunto: Optional[str]
    pdf_desbloqueado: bool
    pdf_nome_original: Optional[str] = None
    pdf_path: Optional[str] = None
    storage_path: Optional[str] = None
    variacao_percentual: Optional[float] = None
    debito_automatico: bool = False
    created_at: datetime
    updated_at: datetime


    # Nested data
    condominio: Optional[CondominioMini] = None
    concessionaria: Optional[ConcessionariaMini] = None

    model_config = {"from_attributes": True}



# ─── Alerta ───────────────────────────────────────────────────


class AlertaResponse(BaseModel):
    id: uuid.UUID
    condominio_id: Optional[uuid.UUID]
    fatura_id: Optional[uuid.UUID]
    tipo: str
    gravidade: str
    mensagem: str
    lido: bool
    resolvido: bool
    created_at: datetime
    condominio: Optional[CondominioMini] = None
    model_config = {"from_attributes": True}



# ─── Email Log ────────────────────────────────────────────────


class EmailLogResponse(BaseModel):
    id: uuid.UUID
    gmail_message_id: str
    remetente: str
    assunto: str
    recebido_em: datetime
    status: str
    condominio_id: Optional[uuid.UUID] = None
    codigo_identificacao: Optional[str] = None
    fatura_id: Optional[uuid.UUID] = None
    erro_msg: Optional[str] = None
    created_at: datetime
    # Computed fields in router
    condominio_nome: Optional[str] = None
    fatura_desbloqueada: Optional[bool] = None
    fatura_url: Optional[str] = None
    fatura_valor: Optional[float] = None
    fatura_vencimento: Optional[date] = None
    dados_extraidos: Optional[dict[str, Any]] = None

    @field_validator("dados_extraidos", mode="before")
    @classmethod
    def parse_dados_extraidos(cls, v):
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v

    model_config = {"from_attributes": True}


# ─── Pagination ───────────────────────────────────────────────


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    per_page: int
    pages: int


# ─── Import ───────────────────────────────────────────────────


class ImportPreviewRow(BaseModel):
    acao: str  # CRIAR | ATUALIZAR | IGNORAR
    dados: dict[str, Any]
    validacao: bool
    mensagem: Optional[str] = None


class ImportPreviewResponse(BaseModel):
    tipo: str
    total_linhas: int
    criar: int
    atualizar: int
    ignorar: int
    erros: int
    rows: list[ImportPreviewRow]


class ImportConfirmResponse(BaseModel):
    sucesso: int
    erros: int
    mensagem: str


class ImportConfirmRequest(BaseModel):
    tipo: Literal["condominios", "concessionarias"]
    rows: list[ImportPreviewRow]


# ─── Relatórios Gerados ───────────────────────────────────────


class RelatorioGeradoCreate(BaseModel):
    nome: str
    tipo_relatorio: (
        str  # briefing_executivo | mesa_operacional | variacao_risco | ...
    )
    formato: str  # pdf
    usuario: str = "Operador"
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None


class RelatorioGeradoResponse(BaseModel):
    id: uuid.UUID
    nome: str
    tipo_relatorio: str
    formato: str
    usuario: str
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    notebooklm_status: str = "pending"
    notebooklm_artifact_type: Optional[str] = None
    notebooklm_notebook_id: Optional[str] = None
    notebooklm_artifact_id: Optional[str] = None
    notebooklm_export_url: Optional[str] = None
    notebooklm_error: Optional[str] = None
    notebooklm_attempts: int = 0
    notebooklm_processed_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Contrato ─────────────────────────────────────────────────


class ContratoCreate(BaseModel):
    condominio_id: uuid.UUID
    empresa: str
    razao_social: Optional[str] = None
    cnpj_empresa: Optional[str] = None
    email_contato: Optional[str] = None
    telefone_contato: Optional[str] = None
    tipo_contrato: str
    tipo_personalizado: Optional[str] = None
    data_inicio: date
    data_fim: Optional[date] = None
    assinado: bool = False
    data_assinatura: Optional[date] = None
    valor_inicial: float = 0.0
    valor_atual: float = 0.0
    data_reajuste: Optional[date] = None
    indice_reajuste: Optional[str] = None
    ultimo_reajuste: Optional[date] = None
    periodicidade: str = "mensal"
    dia_vencimento: Optional[int] = None
    pagamento_recebido: bool = False
    observacoes: Optional[str] = None


class ContratoUpdate(BaseModel):
    empresa: Optional[str] = None
    razao_social: Optional[str] = None
    cnpj_empresa: Optional[str] = None
    email_contato: Optional[str] = None
    telefone_contato: Optional[str] = None
    tipo_contrato: Optional[str] = None
    tipo_personalizado: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    assinado: Optional[bool] = None
    data_assinatura: Optional[date] = None
    valor_inicial: Optional[float] = None
    valor_atual: Optional[float] = None
    data_reajuste: Optional[date] = None
    indice_reajuste: Optional[str] = None
    ultimo_reajuste: Optional[date] = None
    periodicidade: Optional[str] = None
    dia_vencimento: Optional[int] = None
    pagamento_recebido: Optional[bool] = None
    observacoes: Optional[str] = None


class ContratoResponse(BaseModel):
    id: uuid.UUID
    condominio_id: uuid.UUID
    empresa: str
    razao_social: Optional[str] = None
    cnpj_empresa: Optional[str] = None
    email_contato: Optional[str] = None
    telefone_contato: Optional[str] = None
    tipo_contrato: str
    tipo_personalizado: Optional[str] = None
    data_inicio: date
    data_fim: Optional[date] = None
    assinado: bool = False
    data_assinatura: Optional[date] = None
    valor_inicial: float
    valor_atual: float
    data_reajuste: Optional[date] = None
    indice_reajuste: Optional[str] = None
    ultimo_reajuste: Optional[date] = None
    periodicidade: str
    dia_vencimento: Optional[int] = None
    pagamento_recebido: bool = False
    arquivo_path: Optional[str] = None
    observacoes: Optional[str] = None
    status: str = "ativo"
    condominio_nome: Optional[str] = None
    created_by_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ContratoPagamentoUpdate(BaseModel):
    valor_previsto: Optional[float] = None
    valor_recebido: Optional[float] = None
    recebido: bool = False
    data_recebimento: Optional[date] = None
    observacoes: Optional[str] = None


class ContratoPagamentoResponse(BaseModel):
    id: Optional[uuid.UUID] = None
    contrato_id: uuid.UUID
    ano: int
    mes: int
    mes_label: str
    valor_previsto: float
    valor_recebido: Optional[float] = None
    recebido: bool = False
    data_recebimento: Optional[date] = None
    observacoes: Optional[str] = None
    pendente: bool = False
    vencido: bool = False


class ContratoDashboardItem(ContratoResponse):
    pagamentos: list[ContratoPagamentoResponse] = []
    pagamentos_recebidos: int = 0
    pagamentos_pendentes: int = 0
    total_previsto_ano: float = 0.0
    total_recebido_ano: float = 0.0


# ─── Reajuste Concessionária ──────────────────────────────────


class ReajusteConcessionariaCreate(BaseModel):
    percentual: float
    mes_aplicacao: str
    tipo_concessionaria: str


class ReajusteConcessionariaResponse(BaseModel):
    id: uuid.UUID
    tipo_concessionaria: str
    percentual: float
    mes_aplicacao: str
    documento_nome: Optional[str] = None
    documento_base64: Optional[str] = None
    storage_path: Optional[str] = None
    aplicado_por: str
    registros_afetados: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Histórico Fatura ───────────────────────────────────────────


class HistoricoFaturaResponse(BaseModel):
    id: uuid.UUID
    condominio_id: Optional[uuid.UUID] = None
    concessionaria_id: Optional[uuid.UUID] = None
    referencia: str
    vencimento: Optional[date] = None
    valor: float
    pdf_nome_original: Optional[str] = None
    storage_path: Optional[str] = None
    debito_automatico: bool = False
    status: Optional[str] = None
    gmail_message_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Nested
    condominio: Optional[CondominioMini] = None
    concessionaria: Optional[ConcessionariaMini] = None

    model_config = {"from_attributes": True}
