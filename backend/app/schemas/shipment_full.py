from pydantic import BaseModel
from .shipment import ShipmentRead
from .container import ContainerRead
from .stop import StopRead

class ShipmentFull(BaseModel):
    shipment: ShipmentRead
    containers: list[ContainerRead]
    stops: list[StopRead]
