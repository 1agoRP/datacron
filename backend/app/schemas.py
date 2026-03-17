import uuid
from datetime import datetime, date
from typing import Optional, Any

from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ─── Auth ────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: uuid.UUID
    nome: str
    email: str
    role: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Condomínio ───────────────────────────────────────────────

class CondominioCreate(BaseModel):
    nome: str
    numero: str
    endereco: str
    cnpj: str
    sindico: str
    cpf_sindico: Optional[str] = None

    @field_validator("cnpj")
    @classmethod
    def validate_cnpj(cls, v: str) -> str:
        digits = "".join(filter(str.isdigit, v))
        if len(digits) != 14:
            raise ValueError("CNPJ deve ter 14 dígitos")
        return v

class CondominioUpdate(BaseModel):
    nome: Optional[str] = None
    endereco: Optional[str] = None
    sindico: Optional[str] = None
    cpf_sindico: Optional[str] = None
    ativo: Optional[bool] = None

class CondominioResponse(BaseModel):
    id: uuid.UUID
    nome: str
    numero: str
    endereco: str
    cnpj: str
    sindico: str
    cpf_sindico: Optional[str]
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
    tipo: str  # Enel | Sabesp | Comgás | Outros
    instalacao: str
    email_esperado: Optional[EmailStr] = None
    regra_senha: str = "5_primeiros_cnpj"
    senha_manual: Optional[str] = None
    dia_vencimento: int
    valor_medio: float = 0.0

class ConcessionariaUpdate(BaseModel):
    tipo: Optional[str] = None
    email_esperado: Optional[EmailStr] = None
    regra_senha: Optional[str] = None
    senha_manual: Optional[str] = None
    dia_vencimento: Optional[int] = None
    valor_medio: Optional[float] = None
    ativo: Optional[bool] = None

class ConcessionariaResponse(BaseModel):
    id: uuid.UUID
    condominio_id: uuid.UUID
    tipo: str
    instalacao: str
    email_esperado: Optional[str] = None
    regra_senha: str
    dia_vencimento: int
    valor_medio: float
    ativo: bool
    created_at: datetime
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
    dados_extraidos: Optional[dict[str, Any]]
    variacao_percentual: Optional[float]
    created_at: datetime
    updated_at: datetime
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
