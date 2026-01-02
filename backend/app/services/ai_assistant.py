"""
AI Assistant Service for TMS
Uses Claude API to parse messages and extract order information
"""

from typing import Dict, Any, Optional, List
import json
import re
from datetime import datetime, date
import anthropic
import os
from pathlib import Path

# Load .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)


class AIAssistant:
    """AI Assistant for parsing order information from text/images"""

    def __init__(self):
        # Initialize Claude client
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
        self.client = anthropic.Anthropic(api_key=api_key)

    def extract_order_info(self, message: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Extract order information from a text message

        Args:
            message: User's message (e.g., shipping instruction)
            context: Additional context (customers, sites, etc.)

        Returns:
            Structured order data
        """

        # Build the prompt
        system_prompt = self._build_system_prompt(context)

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                temperature=0,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            )

            # Parse the response
            content = response.content[0].text
            order_data = self._parse_ai_response(content)

            return {
                "success": True,
                "order_data": order_data,
                "raw_response": content,
                "confidence": self._calculate_confidence(order_data)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "order_data": None
            }

    def extract_from_image(self, image_data: str, image_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Extract order information from an image (POD, booking, etc.)

        Args:
            image_data: Base64 encoded image
            image_type: MIME type of the image

        Returns:
            Structured order data
        """

        system_prompt = self._build_system_prompt(None)

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                temperature=0,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": image_type,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": "Hãy trích xuất thông tin đơn hàng từ hình ảnh này. Nếu là ảnh POD (Proof of Delivery), hãy lấy thông tin khách hàng, địa chỉ, hàng hóa, số lượng, thời gian giao."
                            }
                        ]
                    }
                ]
            )

            content = response.content[0].text
            order_data = self._parse_ai_response(content)

            return {
                "success": True,
                "order_data": order_data,
                "raw_response": content,
                "confidence": self._calculate_confidence(order_data)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "order_data": None
            }

    def _build_system_prompt(self, context: Optional[Dict]) -> str:
        """Build system prompt for Claude"""

        base_prompt = """Bạn là một AI assistant chuyên nghiệp cho hệ thống quản lý vận tải (TMS).

Nhiệm vụ của bạn là phân tích tin nhắn hoặc hình ảnh và trích xuất thông tin đơn hàng vận chuyển.

CẤU TRÚC DỮ LIỆU CẦN TRÍCH XUẤT:

```json
{
  "pickup": {
    "location": "Tên địa điểm đón hàng",
    "address": "Địa chỉ cụ thể",
    "contact_name": "Tên người liên hệ",
    "contact_phone": "Số điện thoại",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" (nếu có)
  },
  "delivery": {
    "company_name": "Tên công ty nhận hàng",
    "location": "Tên địa điểm giao hàng",
    "address": "Địa chỉ cụ thể (có thể gồm: đường, xã/phường, huyện/quận, tỉnh/thành phố)",
    "contact_name": "Tên người nhận",
    "contact_phone": "Số điện thoại",
    "date": "YYYY-MM-DD",
    "time": "HH:MM" (nếu có),
    "instructions": "Ghi chú đặc biệt (VD: chờ tiền mới hạ hàng, trước giờ nào)"
  },
  "cargo": {
    "description": "Mô tả hàng hóa",
    "weight_tons": 0.0,
    "quantity": 0,
    "unit": "kiện/pallet/container",
    "special_requirements": "Yêu cầu đặc biệt (nếu có)"
  },
  "customer": {
    "name": "Tên khách hàng (nếu có)",
    "code": "Mã khách hàng (nếu có)"
  },
  "notes": "Ghi chú thêm",
  "urgency": "NORMAL/URGENT/CRITICAL",
  "mentioned_people": ["@Tên người được tag (nếu có)"]
}
```

QUY TẮC PHÂN TÍCH:

1. **Địa chỉ Việt Nam**: Phân tích theo format: Số nhà/Đường, Xã/Phường, Huyện/Quận, Tỉnh/Thành phố
   - VD: "NGỌC LÃNG, NGỌC LÂM, MỸ HÀO, HƯNG YÊN" → Xã Ngọc Lãng, Huyện Ngọc Lâm hoặc Mỹ Hào, Tỉnh Hưng Yên

2. **Thời gian**:
   - "TRƯỚC 9H SÁNG" → time: "09:00"
   - "NGÀY 22/12/2025" → date: "2025-12-22"

3. **Trọng lượng**:
   - "24.75T" → weight_tons: 24.75
   - "15 TẤN" → weight_tons: 15.0

4. **Số lượng**:
   - "KIỆN" → unit: "kiện"
   - "24.75T KIỆN" → có thể là 24.75 tấn, đóng kiện

5. **Ghi chú đặc biệt**:
   - "CHỜ TIỀN MỚI HẠ HÀNG" → thêm vào delivery.instructions
   - "@ mentions" → thêm vào mentioned_people

6. **Độ khẩn**:
   - "GẤP", "URGENT" → URGENT
   - "TRƯỚC [giờ cụ thể]" → URGENT
   - Mặc định → NORMAL

7. **Xử lý thiếu thông tin**:
   - Nếu không có thông tin, để null
   - Nếu không chắc chắn, thêm "?" vào cuối giá trị

QUAN TRỌNG:
- Chỉ trả về JSON, không có text giải thích
- Đảm bảo JSON valid
- Tất cả field text phải là string
- Số phải là number (không có đơn vị)
"""

        # Add context if available
        if context:
            if "customers" in context:
                base_prompt += f"\n\nKHÁCH HÀNG CÓ SẴN:\n{json.dumps(context['customers'], ensure_ascii=False, indent=2)}"

            if "sites" in context:
                base_prompt += f"\n\nĐỊA ĐIỂM CÓ SẴN:\n{json.dumps(context['sites'], ensure_ascii=False, indent=2)}"

        return base_prompt

    def _parse_ai_response(self, content: str) -> Dict[str, Any]:
        """Parse AI response to extract JSON"""

        # Try to find JSON in the response
        json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find any JSON-like structure
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = content

        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # If parsing fails, return raw content
            return {
                "error": "Failed to parse JSON",
                "raw_content": content
            }

    def _calculate_confidence(self, order_data: Dict) -> float:
        """Calculate confidence score based on completeness of data"""

        if not order_data or "error" in order_data:
            return 0.0

        required_fields = [
            "pickup.location",
            "delivery.company_name",
            "delivery.address",
            "delivery.contact_name",
            "cargo.description"
        ]

        score = 0
        for field in required_fields:
            parts = field.split(".")
            value = order_data
            for part in parts:
                value = value.get(part) if isinstance(value, dict) else None
                if value is None:
                    break

            if value:
                score += 1

        return score / len(required_fields)

    def extract_fuel_info(self, images_base64: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Extract fuel log information from fuel pump images

        Args:
            images_base64: List of dicts with {"data": base64_string, "media_type": "image/jpeg"}

        Returns:
            Extracted fuel data: date, odometer_km, actual_liters, unit_price, total_amount, vehicle_plate, station_name, station_location
        """

        system_prompt = """Bạn là AI chuyên trích xuất thông tin đổ xăng/dầu từ hình ảnh.

Phân tích các hình ảnh (có thể là màn hình bơm xăng, biển số xe, đồng hồ km) và trích xuất thông tin:

```json
{
  "date": "YYYY-MM-DD",
  "odometer_km": số km đồng hồ (integer),
  "actual_liters": số lít đổ (float, VD: 269.138),
  "unit_price": đơn giá VND/lít (integer, VD: 17470),
  "total_amount": tổng tiền VND (integer, VD: 4701841),
  "vehicle_plate": "biển số xe (VD: 50E-482.52)",
  "station_name": "tên trạm xăng (nếu có)",
  "station_location": "địa điểm trạm (tỉnh/thành, nếu có)"
}
```

QUY TẮC:
1. Từ màn hình bơm xăng: lấy tổng tiền, số lít, đơn giá, ngày/giờ
2. Từ ảnh biển số: lấy biển số xe
3. Từ đồng hồ km: lấy số km
4. Từ địa điểm/banner trạm: lấy tên trạm, địa điểm
5. Nếu không thấy thông tin, để null
6. Số tiền VND thường không có dấu chấm phân cách hàng nghìn, VD: 4701841 (không phải 4.701.841)
7. Chỉ trả về JSON, không text giải thích"""

        # Build content with multiple images
        content = []
        for img in images_base64:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": img["media_type"],
                    "data": img["data"]
                }
            })
        content.append({
            "type": "text",
            "text": "Hãy trích xuất thông tin đổ xăng/dầu từ các hình ảnh trên."
        })

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0,
                system=system_prompt,
                messages=[{"role": "user", "content": content}]
            )

            response_text = response.content[0].text
            fuel_data = self._parse_ai_response(response_text)

            return {
                "success": True,
                "data": fuel_data,
                "raw_response": response_text
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None
            }

    def suggest_driver(self, order_data: Dict, available_drivers: List[Dict]) -> Optional[Dict]:
        """
        Suggest best driver for the order using AI

        Args:
            order_data: Extracted order information
            available_drivers: List of available drivers with their info

        Returns:
            Suggested driver with reasoning
        """

        if not available_drivers:
            return None

        prompt = f"""Dựa trên thông tin đơn hàng và danh sách tài xế, hãy đề xuất tài xế phù hợp nhất.

ĐơN HÀNG:
{json.dumps(order_data, ensure_ascii=False, indent=2)}

TÀI XẾ KHẢ DỤNG:
{json.dumps(available_drivers, ensure_ascii=False, indent=2)}

Hãy trả về JSON với format:
{{
  "suggested_driver_id": "ID của tài xế",
  "confidence": 0.9,
  "reasoning": "Lý do đề xuất (ví dụ: gần nhất, kinh nghiệm tuyến đường, đánh giá cao)"
}}
"""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )

            content = response.content[0].text
            suggestion = self._parse_ai_response(content)
            return suggestion

        except Exception as e:
            return {
                "error": str(e),
                "suggested_driver_id": None
            }
