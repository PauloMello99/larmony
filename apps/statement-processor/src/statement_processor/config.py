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


settings = Settings()
