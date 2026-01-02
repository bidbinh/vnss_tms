from pydantic import BaseModel

class ContainerCreate(BaseModel):
    shipment_id: str
    container_no: str
    size: str = "40"
    type: str = "DC"
    seal_no: str | None = None

class ContainerRead(BaseModel):
    id: str
    shipment_id: str
    container_no: str
    size: str
    type: str
    seal_no: str | None
