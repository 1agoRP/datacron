import pandas as pd
import json

df = pd.read_excel(r'c:\Users\Iago R. Prado Man\.gemini\antigravity\Datacron\Users.xlsx')
print(df.to_json(orient='records', indent=2))
