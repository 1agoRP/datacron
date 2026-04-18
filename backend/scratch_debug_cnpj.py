import uuid
from datetime import datetime
from pydantic import ValidationError
import sys
sys.path.append(".")
from app.schemas import CondominioCreate

payload = {
    "nome": "Condomínio Teste",
    "numero": "0001",
    "endereco": "Av. Paulista, 100",
    "cnpj": "12.345.678/0001-90",
    "sindico": "Iago Prado",
    "cpf_sindico": "123.456.789-00"
}

try:
    c = CondominioCreate(**payload)
    print("Validation SUCCESS")
except ValidationError as e:
    print("Validation ERROR")
    print(e.json())

# Test with another
payload["cnpj"] = "11.222.333/0001-81"
try:
    c = CondominioCreate(**payload)
    print("Validation SUCCESS 2")
except ValidationError as e:
    print("Validation ERROR 2")
    print(e.json())
