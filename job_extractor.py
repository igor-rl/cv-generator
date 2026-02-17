"""
job_extractor.py
Extrai empresa, cargo e descrição de vagas do Indeed e LinkedIn a partir de uma URL.
Integrado ao server.py como endpoint POST /api/extrair-vaga
"""

import re
import time
import random
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse


# ── Configuração ────────────────────────────────────────────────────────────

# Headers que imitam um browser real para evitar bloqueios simples
HEADERS_POOL = [
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
    },
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    },
]

REQUEST_TIMEOUT = 15  # segundos


# ── Utilitários ──────────────────────────────────────────────────────────────

def get_headers():
    """Retorna um conjunto de headers aleatório do pool."""
    return random.choice(HEADERS_POOL)


def limpar_texto(texto: str) -> str:
    """Remove espaços extras e caracteres de controle."""
    if not texto:
        return ""
    texto = re.sub(r'\s+', ' ', texto)
    return texto.strip()


def detectar_plataforma(url: str) -> str:
    """Identifica a plataforma pela URL."""
    dominio = urlparse(url).netloc.lower()
    if "indeed" in dominio:
        return "indeed"
    if "linkedin" in dominio:
        return "linkedin"
    return "desconhecida"


def fazer_requisicao(url: str) -> requests.Response | None:
    """Faz a requisição HTTP com retry simples."""
    for tentativa in range(3):
        try:
            # Pequena pausa aleatória para parecer humano
            if tentativa > 0:
                time.sleep(random.uniform(2, 4))

            session = requests.Session()
            # Primeiro acessa a homepage para ter cookies válidos
            dominio = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
            session.get(dominio, headers=get_headers(), timeout=REQUEST_TIMEOUT)
            time.sleep(random.uniform(0.5, 1.5))

            response = session.get(url, headers=get_headers(), timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response

        except requests.exceptions.HTTPError as e:
            codigo = e.response.status_code if e.response else 0
            if codigo == 429:
                # Rate limit — esperar mais
                time.sleep(random.uniform(5, 10))
            elif codigo in (403, 401):
                # Bloqueado — não adianta tentar de novo
                return None
        except requests.exceptions.RequestException:
            pass

    return None


# ── Extratores por plataforma ────────────────────────────────────────────────

def extrair_indeed(url: str, soup: BeautifulSoup) -> dict:
    """Extrai dados de uma página de vaga do Indeed."""

    empresa = ""
    cargo = ""
    descricao = ""

    # ── Cargo ──
    # Seletores em ordem de prioridade
    seletores_cargo = [
        ("h1", {"data-testid": "jobsearch-JobInfoHeader-title"}),
        ("h1", {"class": re.compile(r"jobsearch-JobInfoHeader-title")}),
        ("h1", {}),
    ]
    for tag, attrs in seletores_cargo:
        el = soup.find(tag, attrs)
        if el:
            cargo = limpar_texto(el.get_text())
            break

    # ── Empresa ──
    seletores_empresa = [
        ("div", {"data-testid": "inlineHeader-companyName"}),
        ("div", {"data-company-name": True}),
        ("a", {"data-testid": "jobsearch-CompanyInfoContainer"}),
        ("span", {"class": re.compile(r"companyName|company")}),
    ]
    for tag, attrs in seletores_empresa:
        el = soup.find(tag, attrs)
        if el:
            empresa = limpar_texto(el.get_text())
            break

    # ── Descrição ──
    seletores_descricao = [
        ("div", {"id": "jobDescriptionText"}),
        ("div", {"class": re.compile(r"jobsearch-jobDescriptionText")}),
        ("div", {"data-testid": "jobsearch-JobComponent-description"}),
    ]
    for tag, attrs in seletores_descricao:
        el = soup.find(tag, attrs)
        if el:
            descricao = limpar_texto(el.get_text(separator="\n"))
            break

    return {"empresa": empresa, "cargo": cargo, "descricao": descricao}


def extrair_linkedin(url: str, soup: BeautifulSoup) -> dict:
    """Extrai dados de uma página de vaga do LinkedIn (acesso público)."""

    empresa = ""
    cargo = ""
    descricao = ""

    # ── Cargo ──
    seletores_cargo = [
        ("h1", {"class": re.compile(r"top-card-layout__title|topcard__title")}),
        ("h1", {"class": re.compile(r"job-title")}),
        ("h1", {}),
    ]
    for tag, attrs in seletores_cargo:
        el = soup.find(tag, attrs)
        if el:
            cargo = limpar_texto(el.get_text())
            break

    # ── Empresa ──
    seletores_empresa = [
        ("a", {"class": re.compile(r"topcard__org-name-link|top-card-layout__company")}),
        ("span", {"class": re.compile(r"topcard__flavor(?!--bullet)")}),
        ("a", {"data-tracking-control-name": re.compile(r"public_jobs_topcard")}),
    ]
    for tag, attrs in seletores_empresa:
        el = soup.find(tag, attrs)
        if el:
            empresa = limpar_texto(el.get_text())
            break

    # ── Descrição ──
    seletores_descricao = [
        ("div", {"class": re.compile(r"show-more-less-html__markup")}),
        ("div", {"class": re.compile(r"description__text")}),
        ("section", {"class": re.compile(r"description")}),
    ]
    for tag, attrs in seletores_descricao:
        el = soup.find(tag, attrs)
        if el:
            descricao = limpar_texto(el.get_text(separator="\n"))
            break

    return {"empresa": empresa, "cargo": cargo, "descricao": descricao}


def extrair_generico(url: str, soup: BeautifulSoup) -> dict:
    """
    Fallback genérico para outras plataformas ou quando os seletores específicos falham.
    Usa heurísticas baseadas em meta tags e estrutura semântica comum.
    """

    empresa = ""
    cargo = ""
    descricao = ""

    # ── Cargo via meta tags (muito comum em job boards) ──
    meta_title = soup.find("meta", property="og:title") or soup.find("meta", {"name": "title"})
    if meta_title:
        cargo = limpar_texto(meta_title.get("content", ""))

    # Fallback para <title> da página
    if not cargo and soup.title:
        titulo = soup.title.string or ""
        # Remover sufixo típico de job boards (ex: "Dev Sênior | Indeed")
        cargo = limpar_texto(re.split(r'\s*[|\-–—]\s*', titulo)[0])

    # ── Empresa via meta tags ──
    meta_empresa = (
        soup.find("meta", property="og:site_name") or
        soup.find("meta", {"name": "author"}) or
        soup.find("meta", {"itemprop": "hiringOrganization"})
    )
    if meta_empresa:
        empresa = limpar_texto(meta_empresa.get("content", ""))

    # ── Descrição via meta description ou JSON-LD ──
    # Tenta JSON-LD primeiro (padrão schema.org/JobPosting)
    import json
    scripts_ld = soup.find_all("script", {"type": "application/ld+json"})
    for script in scripts_ld:
        try:
            dados = json.loads(script.string or "{}")
            # Pode ser lista ou objeto
            if isinstance(dados, list):
                dados = next((d for d in dados if d.get("@type") == "JobPosting"), {})
            if dados.get("@type") == "JobPosting":
                cargo = cargo or limpar_texto(dados.get("title", ""))
                empresa = empresa or limpar_texto(
                    dados.get("hiringOrganization", {}).get("name", "")
                    if isinstance(dados.get("hiringOrganization"), dict)
                    else dados.get("hiringOrganization", "")
                )
                desc_raw = dados.get("description", "")
                if desc_raw:
                    # Remover HTML do JSON-LD se houver
                    desc_soup = BeautifulSoup(desc_raw, "html.parser")
                    descricao = limpar_texto(desc_soup.get_text(separator="\n"))
                break
        except (json.JSONDecodeError, AttributeError):
            continue

    # Fallback para meta description
    if not descricao:
        meta_desc = soup.find("meta", property="og:description") or soup.find("meta", {"name": "description"})
        if meta_desc:
            descricao = limpar_texto(meta_desc.get("content", ""))

    return {"empresa": empresa, "cargo": cargo, "descricao": descricao}


# ── Função principal ─────────────────────────────────────────────────────────

def extrair_vaga(url: str) -> dict:
    """
    Extrai dados de uma vaga a partir da URL.

    Retorna:
        {
            "sucesso": bool,
            "plataforma": str,
            "empresa": str,
            "cargo": str,
            "descricao": str,
            "erro": str | None,
            "parcial": bool   # True se extraiu algo mas não tudo
        }
    """
    resultado = {
        "sucesso": False,
        "plataforma": "desconhecida",
        "empresa": "",
        "cargo": "",
        "descricao": "",
        "erro": None,
        "parcial": False,
    }

    # Validar URL
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    plataforma = detectar_plataforma(url)
    resultado["plataforma"] = plataforma

    # Fazer requisição
    response = fazer_requisicao(url)
    if response is None:
        resultado["erro"] = (
            "Não foi possível acessar a página. "
            "O site pode estar bloqueando acesso automatizado. "
            "Tente copiar e colar a descrição manualmente."
        )
        return resultado

    # Verificar se recebeu HTML real ou página de bloqueio
    content_type = response.headers.get("content-type", "")
    if "text/html" not in content_type and "text/plain" not in content_type:
        resultado["erro"] = f"Resposta inesperada do servidor (content-type: {content_type})."
        return resultado

    soup = BeautifulSoup(response.text, "html.parser")

    # Detectar páginas de CAPTCHA ou bloqueio
    texto_pagina = soup.get_text().lower()
    termos_bloqueio = ["verify you are human", "captcha", "access denied", "robot", "automated access"]
    if any(termo in texto_pagina for termo in termos_bloqueio):
        resultado["erro"] = (
            "A página retornou uma verificação de segurança (CAPTCHA). "
            "Copie a descrição da vaga manualmente."
        )
        return resultado

    # Extrair com o parser correto
    if plataforma == "indeed":
        dados = extrair_indeed(url, soup)
    elif plataforma == "linkedin":
        dados = extrair_linkedin(url, soup)
    else:
        dados = extrair_generico(url, soup)

    # Se os seletores específicos não pegaram tudo, complementar com genérico
    if plataforma in ("indeed", "linkedin"):
        if not dados["empresa"] or not dados["cargo"] or not dados["descricao"]:
            fallback = extrair_generico(url, soup)
            dados["empresa"] = dados["empresa"] or fallback["empresa"]
            dados["cargo"] = dados["cargo"] or fallback["cargo"]
            dados["descricao"] = dados["descricao"] or fallback["descricao"]

    resultado.update(dados)

    # Avaliar qualidade da extração
    campos_preenchidos = sum(bool(resultado[c]) for c in ("empresa", "cargo", "descricao"))

    if campos_preenchidos == 0:
        resultado["erro"] = (
            "Não foi possível extrair os dados da vaga. "
            "O site pode ter mudado sua estrutura. Preencha manualmente."
        )
    elif campos_preenchidos < 3:
        resultado["sucesso"] = True
        resultado["parcial"] = True
        campos_faltando = [c for c in ("empresa", "cargo", "descricao") if not resultado[c]]
        resultado["erro"] = f"Extração parcial. Preencha manualmente: {', '.join(campos_faltando)}."
    else:
        resultado["sucesso"] = True

    return resultado


# ── Teste standalone ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    import json

    url_teste = sys.argv[1] if len(sys.argv) > 1 else input("Cole a URL da vaga: ").strip()
    print(f"\nExtraindo: {url_teste}\n")

    resultado = extrair_vaga(url_teste)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))