from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.dependencies import require_role
from app.models.user import User
from app.security import read_pdf_upload
from app.services.previsao_analysis import analyze_balancete_pdf

router = APIRouter(prefix="/previsao", tags=["Análise de Previsão"])


@router.post("/analisar")
async def analisar_balancete(
    file: UploadFile = File(...),
    _: User = Depends(require_role("admin")),
):
    pdf_bytes = await read_pdf_upload(file)

    try:
        return analyze_balancete_pdf(pdf_bytes, file.filename)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Não foi possível interpretar o balancete: {exc}",
        ) from exc
