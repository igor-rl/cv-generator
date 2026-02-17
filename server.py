import http.server
import socketserver
import json
import os
import uuid
from datetime import datetime
from urllib.parse import urlparse

# Importar extrator de vagas (com fallback se dependências não instaladas)
try:
    import sys, os
    sys.path.insert(0, os.path.join(os.getcwd(), 'core'))
    from job_extractor import extrair_vaga
    EXTRATOR_DISPONIVEL = True
except ImportError as e:
    EXTRATOR_DISPONIVEL = False
    print(f"Aviso: job_extractor não disponível ({e}). Instale: pip install requests beautifulsoup4")

PORT = 8232
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
        elif path.startswith('/api/vagas/delete/'):
            vaga_id = path.split('/')[-1]
            self.delete_vaga(vaga_id)
        elif path.startswith('/api/curriculo/delete/'):
            vaga_id = path.split('/')[-1]
            self.delete_curriculo(vaga_id)
        elif path.startswith('/api/curriculo/'):
            vaga_id = path.split('/')[-1]
            self.save_curriculo(vaga_id, body)
        elif path == '/api/extrair-vaga':
            self.extrair_vaga_url(body)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Endpoint not found')

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_ok(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'Success')

    def save_json(self, filename, body):
        try:
            data = json.loads(body)
            with open(os.path.join(DATA_DIR, filename), 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self.send_ok()
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
            self.send_ok()
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
            self.send_json_response(vagas)
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
            self.send_json_response(nova_vaga)
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
            self.send_ok()
            print(f'Vaga atualizada: {vaga_id}')
        except Exception as e:
            print('Erro ao atualizar vaga:', e)
            self.send_error(500, str(e))

    def delete_vaga(self, vaga_id):
        try:
            vagas = load_vagas()
            vagas = [v for v in vagas if v['uuid'] != vaga_id]
            save_vagas(vagas)
            # Tentar apagar currículo associado
            curriculo_path = os.path.join(CURRICULOS_DIR, f'{vaga_id}.json')
            if os.path.exists(curriculo_path):
                os.remove(curriculo_path)
            self.send_ok()
            print(f'Vaga excluída: {vaga_id}')
        except Exception as e:
            print('Erro ao excluir vaga:', e)
            self.send_error(500, str(e))

    def save_curriculo(self, vaga_id, body):
        try:
            data = json.loads(body)
            curriculo_path = os.path.join(CURRICULOS_DIR, f'{vaga_id}.json')
            with open(curriculo_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self.send_ok()
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
                self.send_json_response(curriculo)
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'Curriculo not found')
        except Exception as e:
            print('Erro ao buscar currículo:', e)
            self.send_error(500, str(e))

    def delete_curriculo(self, vaga_id):
        try:
            curriculo_path = os.path.join(CURRICULOS_DIR, f'{vaga_id}.json')
            if os.path.exists(curriculo_path):
                os.remove(curriculo_path)
                print(f'Currículo excluído: {vaga_id}')
            self.send_ok()
        except Exception as e:
            print('Erro ao excluir currículo:', e)
            self.send_error(500, str(e))

    def extrair_vaga_url(self, body):
        if not EXTRATOR_DISPONIVEL:
            self.send_json_response({
                "sucesso": False,
                "erro": "Dependências não instaladas. Execute: pip install requests beautifulsoup4"
            }, 503)
            return
        try:
            data = json.loads(body)
            url = data.get('url', '').strip()
            if not url:
                self.send_json_response({"sucesso": False, "erro": "URL não informada."}, 400)
                return
            print(f'Extraindo vaga de: {url}')
            resultado = extrair_vaga(url)
            self.send_json_response(resultado)
        except Exception as e:
            print(f'Erro ao extrair vaga: {e}')
            self.send_json_response({"sucesso": False, "erro": str(e)}, 500)

    def log_message(self, format, *args):
        # Log mais limpo no terminal
        print(f'[{self.date_time_string()}] {format % args}')

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Servidor rodando em http://localhost:{PORT}")
    print(f"Diretório de dados: {DATA_DIR}")
    print(f"Diretório de currículos: {CURRICULOS_DIR}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor finalizado.")