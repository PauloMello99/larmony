import os


class Settings:
    """Config lida direto de env — sem lib de settings extra pra um serviço
    deste tamanho (mesmo princípio de simplicidade do resto do repo)."""

    @property
    def processor_shared_secret(self) -> str:
        secret = os.environ.get("PROCESSOR_SHARED_SECRET", "")
        if not secret:
            raise RuntimeError("PROCESSOR_SHARED_SECRET não configurado")
        return secret

    @property
    def groq_api_key(self) -> str | None:
        # Ausente = Fase 4 (fallback LLM) desligada, não erro — dev/CI sem
        # a chave continua rodando as camadas 1-4 normalmente (ADR-0033).
        return os.environ.get("GROQ_API_KEY") or None


settings = Settings()
