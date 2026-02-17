import http.server
import socketserver
import json
import os
import uuid
from datetime import datetime
from urllib.parse import urlparse

PORT = 8230
ROOT_DIR = os.getcwd()
DATA_DIR = os.path.join(ROOT_DIR, 'data')
VAGAS_FILE = os.path.join(DATA_DIR, 'vagas.json')
CURRICULOS_DIR = os.path.join(DATA_DIR, 'curriculos')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CURRICULOS_DIR, exist_ok=True)

def load_vagas():
    if os.path.exists(VAGAS_FILE):
        with open(VAGAS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_vagas(vagas):
    with open(VAGAS_FILE, 'w', encoding='utf-8') as f:
        json.dump(vagas, f, indent=2, ensure_ascii=False)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        
        if path == '/data/personal-data.json':
            self.serve_file('personal-data.json', 'application/json')
        elif path == '/data/personal-history.md':
            self.serve_file('personal-history.md', 'text/markdown')
        elif path == '/api/vagas':
            self.list_vagas()
        elif path.startswith('/api/curriculo/'):
            vaga_id = path.split('/')[-1]
            self.get_curriculo(vaga_id)
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
        elif path == '/api/vagas':
            self.create_vaga(body)
        elif path.startswith('/api/vagas/update/'):
            vaga_id = path.split('/')[-1]
            self.update_vaga(vaga_id, body)
        elif path.startswith('/api/curriculo/'):
            vaga_id = path.split('/')[-1]
            self.save_curriculo(vaga_id, body)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Endpoint not found')
            return

    def save_json(self, filename, body):
        try:
            data = json.loads(body)
            with open(os.path.join(DATA_DIR, filename), 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'Success')
            print(f'{filename} salvo com sucesso.')
        except Exception as e:
            print('Erro ao salvar JSON:', e)
            self.send_error(500, str(e))

    def save_md(self, filename, body):
        try:
            data = json.loads(body)
            history = data.get('history', '')
            with open(os.path.join(DATA_DIR, filename), 'w', encoding='utf-8') as f:
                f.write(history)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'Success')
            print(f'{filename} salvo com sucesso.')
        except Exception as e:
            print('Erro ao salvar Markdown:', e)
            self.send_error(500, str(e))

    def serve_file(self, filename, content_type):
        path = os.path.join(DATA_DIR, filename)
        self.send_response(200)
        self.send_header('Content-Type', f'{content_type}; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                self.wfile.write(f.read().encode('utf-8'))
        else:
            self.wfile.write(b'')

    def list_vagas(self):
        try:
            vagas = load_vagas()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(vagas, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            print('Erro ao listar vagas:', e)
            self.send_error(500, str(e))

    def create_vaga(self, body):
        try:
            data = json.loads(body)
            vagas = load_vagas()
            
            nova_vaga = {
                'uuid': str(uuid.uuid4()),
                'empresa': data.get('empresa', ''),
                'cargo': data.get('cargo', ''),
                'descricao': data.get('descricao', ''),
                'status': 'criada',
                'data_cadastro': datetime.now().isoformat(),
                'data_atualizacao': datetime.now().isoformat()
            }
            
            vagas.append(nova_vaga)
            save_vagas(vagas)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(nova_vaga, ensure_ascii=False).encode('utf-8'))
            print(f'Vaga criada: {nova_vaga["uuid"]}')
        except Exception as e:
            print('Erro ao criar vaga:', e)
            self.send_error(500, str(e))

    def update_vaga(self, vaga_id, body):
        try:
            data = json.loads(body)
            vagas = load_vagas()
            
            for vaga in vagas:
                if vaga['uuid'] == vaga_id:
                    vaga['empresa'] = data.get('empresa', vaga['empresa'])
                    vaga['cargo'] = data.get('cargo', vaga['cargo'])
                    vaga['descricao'] = data.get('descricao', vaga['descricao'])
                    vaga['status'] = data.get('status', vaga['status'])
                    vaga['data_atualizacao'] = datetime.now().isoformat()
                    break
            
            save_vagas(vagas)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'Success')
            print(f'Vaga atualizada: {vaga_id}')
        except Exception as e:
            print('Erro ao atualizar vaga:', e)
            self.send_error(500, str(e))

    def save_curriculo(self, vaga_id, body):
        try:
            data = json.loads(body)
            curriculo_path = os.path.join(CURRICULOS_DIR, f'{vaga_id}.json')
            
            with open(curriculo_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'Success')
            print(f'Currículo salvo para vaga: {vaga_id}')
        except Exception as e:
            print('Erro ao salvar currículo:', e)
            self.send_error(500, str(e))

    def get_curriculo(self, vaga_id):
        try:
            curriculo_path = os.path.join(CURRICULOS_DIR, f'{vaga_id}.json')
            
            if os.path.exists(curriculo_path):
                with open(curriculo_path, 'r', encoding='utf-8') as f:
                    curriculo = json.load(f)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(curriculo, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'Curriculo not found')
        except Exception as e:
            print('Erro ao buscar currículo:', e)
            self.send_error(500, str(e))

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Servidor rodando em http://localhost:{PORT}")
    print(f"Diretório de dados: {DATA_DIR}")
    print(f"Diretório de currículos: {CURRICULOS_DIR}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor finalizado.")