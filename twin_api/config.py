"""Runtime settings for the Drava inference service."""

import os

from pydantic import BaseModel

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class ServiceConfig(BaseModel):
    service_name: str = "drava-ml-service"
    version: str = "1.4.0"
    host: str = "0.0.0.0"
    port: int = int(os.environ.get("PORT", 8000))
    debug: bool = True
    models_dir: str = os.path.join(_ROOT, "models")
    data_sources_path: str = os.path.join(_ROOT, "datasets", "registry.yaml")
    physics_config_path: str = os.path.join(_ROOT, "params", "well.yaml")


config = ServiceConfig()
