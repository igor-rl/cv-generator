import http.server
import socketserver
import json
import os
from urllib.parse import urlparse

PORT = 8000
ROOT_DIR = os.getcwd()
DATA_DIR = os.path.join(ROOT_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/data/personal-data.json':
            self.serve_file('personal-data.json', 'application/json')
        elif path == '/data/personal-history.md':
            self.serve_file('personal-history.md', 'text/markdown')
        else:
            super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)

        if path == '/save-personal':
            self.save_json('personal-data.json', body)
        elif path == '/save-history':
            self.save_md('personal-history.md', body)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Endpoint not found')
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Success')


    def save_json(self, filename, body):
        try:
            data = json.loads(body)
            with open(os.path.join(DATA_DIR, filename), 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f'{filename} salvo com sucesso.')
        except Exception as e:
            print('Erro ao salvar JSON:', e)

    def save_md(self, filename, body):
        try:
            data = json.loads(body)
            history = data.get('history', '')
            with open(os.path.join(DATA_DIR, filename), 'w', encoding='utf-8') as f:
                f.write(history)
            print(f'{filename} salvo com sucesso.')
        except Exception as e:
            print('Erro ao salvar Markdown:', e)

    def serve_file(self, filename, content_type):
        path = os.path.join(DATA_DIR, filename)
        self.send_response(200)
        self.send_header('Content-Type', f'{content_type}; charset=utf-8')
        self.end_headers()
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                self.wfile.write(f.read().encode('utf-8'))
        else:
            self.wfile.write(b'')

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Servidor rodando em http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Servidor finalizado.")
