FROM python:3.12-slim

WORKDIR /app

# opencv-python (dependência transitiva de rapidocr e easyocr, ambos
# puxados pelo docling independente de qual OCR a gente usa -- rapidocr é
# hard dependency do docling-slim[standard]) precisa de libs gráficas de
# sistema que a imagem slim não traz. Achado real (build falhou sem isso):
# ImportError: libxcb.so.1: cannot open shared object file.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 \
      libglib2.0-0 \
      libsm6 \
      libxext6 \
      libxrender1 \
      libxcb1 \
      libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY src/ ./src/

RUN pip install --no-cache-dir .

# Fase 3 (OCR/Docling): baixa os modelos NO BUILD, nunca em cold-start de
# runtime (achado da PoC: baixar sob demanda repete o download a cada
# instância fria, minutos de latência extra). Validado com instalação real
# (docling 2.121.0): o conjunto default de `docling-tools models download`
# (sem argumentos) é layout+tableformer+code_formula+picture_classifier+
# RAPIDOCR -- NÃO inclui easyocr. Como o pipeline usa EasyOcrOptions (não
# RapidOCR), o default deixaria o modelo real usado em runtime de fora do
# artifacts_path, e com DOCLING_ARTIFACTS_PATH setado o EasyOcrModel força
# download_enabled=False (ver easyocr_model.py) -- ou seja, falharia na
# primeira página real sem baixar sob demanda. Por isso listamos os
# modelos explicitamente: layout+tableformer (estrutura de tabela,
# sempre necessários) e easyocr (motor de OCR escolhido).
ENV DOCLING_ARTIFACTS_PATH=/opt/docling-models
RUN docling-tools models download layout tableformer easyocr --output-dir ${DOCLING_ARTIFACTS_PATH}

# Railway injeta PORT em runtime — mantém 8000 como default local.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn statement_processor.main:app --host 0.0.0.0 --port ${PORT}"]
