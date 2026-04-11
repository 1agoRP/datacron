"""
Full scan test - simulates what run_email_scan does, step by step.
"""
import imaplib
import email as email_lib
from email.header import decode_header
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

GMAIL_USER = "datacroncompany@gmail.com"
GMAIL_APP_PASSWORD = "fmbmbtvzthuxlgak"

print("=== STEP 1: IMAP Login ===")
try:
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
    print("[OK] Logged in")
except Exception as e:
    print(f"[FAIL] {e}")
    sys.exit(1)

print("\n=== STEP 2: Search UNSEEN ===")
mail.select("inbox")
status, messages = mail.search(None, "UNSEEN")
msg_ids = messages[0].split()
print(f"[OK] {len(msg_ids)} unread messages")

print("\n=== STEP 3: Inspect first 3 messages for PDFs ===")
for m_id in msg_ids[:3]:
    print(f"\n--- Message IMAP ID: {m_id.decode()} ---")
    res, msg_data = mail.fetch(m_id, "(BODY.PEEK[])")
    if res != "OK":
        print(f"  [FAIL] fetch returned {res}")
        continue
    
    raw_email = msg_data[0][1]
    msg = email_lib.message_from_bytes(raw_email)
    
    # Subject
    subject_raw = msg.get("Subject", "")
    decoded_list = decode_header(subject_raw)
    subject = ""
    for decoded, charset in decoded_list:
        if isinstance(decoded, bytes):
            subject += decoded.decode(charset or 'utf-8', errors='ignore')
        else:
            subject += str(decoded)
    
    # From
    from_raw = msg.get("From", "")
    sender = from_raw.split("<")[-1].replace(">", "").strip()
    
    # Message-ID
    message_id = msg.get("Message-ID", "N/A")
    
    print(f"  From: {sender}")
    print(f"  Subject: {subject[:100]}")
    print(f"  Message-ID: {message_id[:80]}")
    print(f"  Content-Type: {msg.get_content_type()}")
    print(f"  Is Multipart: {msg.is_multipart()}")
    
    # Walk parts
    pdf_count = 0
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get('Content-Disposition'))
            fn = part.get_filename()
            if fn:
                decoded_fn = decode_header(fn)[0][0]
                if isinstance(decoded_fn, bytes):
                    fn = decoded_fn.decode('utf-8', errors='ignore')
                print(f"  Attachment: {fn} | type: {ct}")
                if fn.lower().endswith('.pdf') or 'pdf' in ct.lower():
                    pdf_count += 1
                    data = part.get_payload(decode=True)
                    print(f"    -> PDF found! Size: {len(data)} bytes")
    
    # Extract body
    body_text = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get('Content-Disposition'))
            if ct in ('text/plain', 'text/html') and 'attachment' not in cd:
                payload = part.get_payload(decode=True)
                if payload:
                    body_text += payload.decode(part.get_content_charset() or 'utf-8', errors='ignore') + " "
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body_text = payload.decode(msg.get_content_charset() or 'utf-8', errors='ignore')
    
    # Clean HTML
    import re
    body_clean = re.sub(r'<[^>]+>', ' ', body_text)
    body_clean = re.sub(r'\s+', ' ', body_clean).strip()
    
    print(f"  Body length: {len(body_clean)} chars")
    print(f"  Body preview: {body_clean[:200]}...")
    print(f"  PDFs found: {pdf_count}")

mail.close()
mail.logout()
print("\n=== DONE ===")
