from os import getenv
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import httpx
import base64
import json

from .logger import logger

load_dotenv()

YUKASSA_SHOP_ID = getenv('YUKASSA_SHOP_ID')
YUKASSA_SECRET_KEY = getenv('YUKASSA_SECRET_KEY')

YUKASSA_API_URL = "https://api.yookassa.ru/v3"
YUKASSA_API_TEST_URL = "https://api.yookassa.ru/v3"

IS_TEST_MODE = YUKASSA_SECRET_KEY and YUKASSA_SECRET_KEY.startswith('test_')


def get_auth_header() -> str:
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        raise ValueError(
            "YUKASSA_SHOP_ID and YUKASSA_SECRET_KEY not found")

    credentials = f"{YUKASSA_SHOP_ID}:{YUKASSA_SECRET_KEY}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


async def create_payment(
    amount: int,
    description: str,
    return_url: str,
    metadata: Optional[Dict[str, Any]] = None,
    capture: bool = True
) -> Dict[str, Any]:
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        logger.error("YUKASSA_SHOP_ID or YUKASSA_SECRET_KEY not initialized")
        raise ValueError("YUKASSA credentials not configured")

    url = f"{YUKASSA_API_TEST_URL}/payments"
    headers = {
        "Authorization": get_auth_header(),
        "Content-Type": "application/json",
        "Idempotence-Key": metadata.get("idempotence_key", "") if metadata else ""
    }

    amount_in_kopecks = amount * 100

    payload = {
        "amount": {
            "value": f"{amount_in_kopecks / 100:.2f}",
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": return_url
        },
        "capture": capture,
        "description": description
    }

    if metadata:
        payload["metadata"] = metadata

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()

            logger.info(f"Payment created in Yookassa: {result.get('id')}")
            return result

    except httpx.HTTPStatusError as e:
        logger.error(f"Yookassa API error: {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating payment: {str(e)}")
        raise


async def get_payment(payment_id: str) -> Dict[str, Any]:
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        raise ValueError("YUKASSA credentials not configured")

    url = f"{YUKASSA_API_TEST_URL}/payments/{payment_id}"
    headers = {
        "Authorization": get_auth_header(),
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"Yookassa API error: {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting payment: {str(e)}")
        raise


async def capture_payment(payment_id: str, amount: Optional[int] = None) -> Dict[str, Any]:
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        raise ValueError("YUKASSA credentials not configured")

    url = f"{YUKASSA_API_TEST_URL}/payments/{payment_id}/capture"
    headers = {
        "Authorization": get_auth_header(),
        "Content-Type": "application/json",
        "Idempotence-Key": f"capture_{payment_id}"
    }

    payload = {}
    if amount:
        amount_in_kopecks = amount * 100
        payload["amount"] = {
            "value": f"{amount_in_kopecks / 100:.2f}",
            "currency": "RUB"
        }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"Yookassa API error: {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error capturing payment: {str(e)}")
        raise


async def cancel_payment(payment_id: str) -> Dict[str, Any]:
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        raise ValueError("YUKASSA credentials not configured")

    url = f"{YUKASSA_API_TEST_URL}/payments/{payment_id}/cancel"
    headers = {
        "Authorization": get_auth_header(),
        "Content-Type": "application/json",
        "Idempotence-Key": f"cancel_{payment_id}"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json={}, headers=headers)
            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"Yookassa API error: {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error canceling payment: {str(e)}")
        raise


async def create_refund(
    payment_id: str,
    amount: Optional[int] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        raise ValueError("YUKASSA credentials not configured")

    url = f"{YUKASSA_API_TEST_URL}/refunds"
    headers = {
        "Authorization": get_auth_header(),
        "Content-Type": "application/json",
        "Idempotence-Key": f"refund_{payment_id}_{amount or 'full'}"
    }

    payload = {
        "payment_id": payment_id
    }

    if amount:
        amount_in_kopecks = amount * 100
        payload["amount"] = {
            "value": f"{amount_in_kopecks / 100:.2f}",
            "currency": "RUB"
        }

    if description:
        payload["description"] = description

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            logger.info(
                f"Refund created for payment {payment_id}: {result.get('id')}")
            return result

    except httpx.HTTPStatusError as e:
        logger.error(f"Yookassa API error: {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating refund: {str(e)}")
        raise


def verify_webhook_signature(data: Dict[str, Any], signature: Optional[str] = None) -> bool:
    return True
