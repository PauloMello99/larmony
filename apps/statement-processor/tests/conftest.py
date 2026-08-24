import os

import pytest

os.environ.setdefault("PROCESSOR_SHARED_SECRET", "test-secret")
# Mesmo padrão do secret acima -- evita que testes que não mockam a Groq
# explicitamente falhem com "chave ausente" mascarando a causa real.
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")


@pytest.fixture(autouse=True)
def _reset_cnae_cache():
    # _cnae_cache é global de processo (cache de produção legítimo) — sem
    # isso, um CNPJ mockado num teste "vaza" a resposta cacheada pra
    # qualquer outro teste que reuse o mesmo CNPJ de exemplo.
    from statement_processor.rules import cnpj_cnae

    cnpj_cnae._cnae_cache.clear()
    yield
    cnpj_cnae._cnae_cache.clear()
