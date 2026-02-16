# Usa Python 3.12 slim
FROM python:3.12-slim

# Evita .pyc e logs bufferizados
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Diretório de trabalho
WORKDIR /workspace

# Dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Pipenv
RUN pip install --no-cache-dir pipenv

# Mantém container ativo (opcional)
CMD ["tail", "-f", "/dev/null"]
