from app.services.email_monitor import get_imap_connection
m = get_imap_connection()
if m:
    m.select('"[Gmail]/All Mail"', readonly=True)
    res, data = m.fetch('1', '(X-GM-MSGID)')
    print(f"Fetch results: {data}")
    m.logout()
