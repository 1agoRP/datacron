import re

def calculate_sabesp_ref(text):
    month_map = {
        "JAN": "01", "FEV": "02", "MAR": "03", "ABR": "04", "MAI": "05", "JUN": "06",
        "JUL": "07", "AGO": "08", "SET": "09", "OUT": "10", "NOV": "11", "DEZ": "12",
        "JANEIRO": "01", "FEVEREIRO": "02", "MARCO": "03", "MARÇO": "03", "ABRIL": "04", 
        "MAIO": "05", "JUNHO": "06", "JULHO": "07", "AGOSTO": "08", "SETEMBRO": "09", 
        "OUTUBRO": "10", "NOVEMBRO": "11", "DEZEMBRO": "12"
    }
    
    emission_match = re.search(r"DATA\s+EMISS[AÃ]O[:\s]*(\d{2})/(\d{2})/(\d{4})", text, re.IGNORECASE)
    if emission_match:
        day = int(emission_match.group(1))
        month = int(emission_match.group(2))
        year = int(emission_match.group(3))
        
        ref_month = month
        ref_year = year
        
        if day <= 15:
            ref_month = month - 1
            if ref_month == 0:
                ref_month = 12
                ref_year = year - 1
        
        month_name_map = {int(v): k for k, v in month_map.items() if len(k) > 3}
        month_name = month_name_map.get(ref_month, "Janeiro").capitalize()
        return f"{month_name}/{ref_year}"
    return None

# Tests
test_cases = [
    ("DATA EMISSÃO 06/04/2026", "Março/2026"),
    ("DATA EMISSÃO 16/04/2026", "Abril/2026"),
    ("DATA EMISSÃO 01/01/2026", "Dezembro/2025"),
    ("DATA EMISSÃO 25/12/2025", "Dezembro/2025"),
]

for text, expected in test_cases:
    actual = calculate_sabesp_ref(text)
    print(f"Input: {text} | Expected: {expected} | Actual: {actual} | {'OK' if actual == expected else 'FAIL'}")

