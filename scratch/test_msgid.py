from app.services.email_monitor import get_imap_connection
m = get_imap_connection()
if m:
    print("Conectado.")
    res, count = m.select('"[Gmail]/All Mail"', readonly=True)
    print(f"Select: {res}, Count: {count}")
    
    # Exemplo de ID do banco: 19ce1deca52be91d
    dec_id = int("19ce1deca52be91d", 16)
    print(f"Buscando decimal: {dec_id}")
    
    res_search, data = m.search(None, f'X-GM-MSGID {dec_id}')
    print(f"Search: {res_search}, Data: {data}")
    m.logout()
