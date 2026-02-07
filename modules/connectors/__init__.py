from .base import BaseConnector
from .samsung import SamsungConnector
from .shinhan import ShinhanConnector
from .hyundai import HyundaiConnector
from .kb import KBConnector

CONNECTORS = {
    "삼성카드": SamsungConnector,
    "신한카드": ShinhanConnector,
    "현대카드": HyundaiConnector,
    "KB국민카드": KBConnector,
}

__all__ = ["BaseConnector", "SamsungConnector", "ShinhanConnector",
           "HyundaiConnector", "KBConnector", "CONNECTORS"]
