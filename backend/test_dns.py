import socket
import sys

host = "google.com"
print(f"Testing resolution for {host}")
try:
    print(f"getaddrinfo: {socket.getaddrinfo(host, 5432)}")
except Exception as e:
    print(f"Error: {e}")
