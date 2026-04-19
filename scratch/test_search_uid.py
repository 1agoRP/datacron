from app.services.email_monitor import get_imap_connection
m = get_imap_connection()
if m:
    m.select('"[Gmail]/All Mail"', readonly=True)
    res, data = m.uid('search', None, 'X-GM-MSGID', '1859760038580852014')
    print(f"Search results: {res}, {data}")
    m.logout()
