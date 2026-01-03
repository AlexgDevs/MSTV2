from os import getenv
from decimal import Decimal
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import httpx
import base64
import json

from .logger import logger
from ..db import db_config
from ...payments.repositories import PaymentRepository

load_dotenv()

YUKASSA_SHOP_ID = getenv('YUKASSA_SHOP_ID')
YUKASSA_SECRET_KEY = getenv('YUKASSA_SECRET_KEY')

YUKASSA_API_URL = "https://api.yookassa.ru/v3"
YUKASSA_API_TEST_URL = "https://api.yookassa.ru/v3"

IS_TEST_MODE = YUKASSA_SECRET_KEY and YUKASSA_SECRET_KEY.startswith('test_')


def check_yukass_credentials():
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        raise ValueError("YUKASSA credentials not configured")

    pass 

def get_api_url() -> str:
    '''
    we receive the URL API depending on our current development testing or production
    '''
    return YUKASSA_API_TEST_URL if IS_TEST_MODE else YUKASSA_API_URL


def get_auth_header() -> str:
    '''
    we create a title to check the availability of this store in Yukassa
    '''
    check_yukass_credentials()

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
    '''
    created payment by yukassa shop
    created header and made payload for creating payment
    '''
    check_yukass_credentials()

    url = f"{get_api_url()}/payments"
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
    '''
    get payment for working other functions
    '''
    check_yukass_credentials()

    url = f"{get_api_url()}/payments/{payment_id}"
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
    '''
    transferring funds to a Yukassy store
    '''
    check_yukass_credentials()

    url = f"{get_api_url()}/payments/{payment_id}/capture"
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
    check_yukass_credentials()
    url = f"{get_api_url()}/payments/{payment_id}/cancel"
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
    '''
    function for arbitration or masters for payment refund
    '''
    check_yukass_credentials()

    url = f"{get_api_url()}/refunds"
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
    # Basic validation - check required fields
    if not data:
        return False

    event = data.get('event')
    payment_object = data.get('object', {})

    # Validate required webhook structure
    if not event or not payment_object:
        return False

    # Validate event type
    valid_events = ['payment.succeeded',
                    'payment.canceled', 'payment.waiting_for_capture']
    if event not in valid_events:
        return False

    # Validate payment object has required fields
    if not payment_object.get('id'):
        return False

    # TODO: Add IP whitelist check for production
    # YooKassa IP ranges should be whitelisted

    return True


async def process_payout_to_seller(
    payment_id: int):
    '''
    function for transferring funds to the seller
    '''
    check_yukass_credentials()
    try:

        payment = await get_payment(payment_id)
        if not payment:
            raise ValueError('Payment not found')

        if payment.get('status') != 'sucessed':
            raise ValueError('Payment not sucessed')

        agreagate_amounts = await agreagate_amounts(payment.get('amount').get('value'))
        seller_amount = agreagate_amounts.get('seller_net')
        master_id = payment.get('metadata').get('seller_id')
        if not master_id:
            raise ValueError('seller_id not found')

        payment_repo = PaymentRepository(db_config.Session())
        master = await payment_repo.get_seller_id(int(master_id))
        if not master:
            raise ValueError('Seller not found')

        if not master.account:
            raise ValueError('Seller not found details account')

        payout_data = {
                "amount": {
                    "value": str(seller_amount),
                    "currency": "RUB"
                },
                "payout_destination_data": {
                    "type": master.account.get_yookassa_payout_data()
                },
                "description": f"Выплата за заказ {payment_id}",
                "metadata": {
                    "payment_id": payment_id,
                    "seller_id": master.id,
                    "purpose": "seller_payout"
                }
            }
            
        url = f"{get_api_url()}/payouts"
        headers = {
            "Authorization": get_auth_header(),
            "Content-Type": "application/json",
            "Idempotence-Key": f"payout_seller_{payment_id}"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payout_data, headers=headers)
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Payout to seller {master.id}: {seller_amount} {payment.get('amount').get('currency', 'None')}")
            return {"success": True, "data": result}
                
    except Exception as e:
        logger.error(f"Error in process_payout_to_seller: {str(e)}")
        return {"success": False, "error": str(e)}


async def process_payout_to_country():
    '''
    function for transferring funds to the country
    '''
    check_yukass_credentials()
    pass


async def process_payout_to_developer():
    '''
    function for transferring funds to the developer
    '''
    check_yukass_credentials()
    pass


async def agregate_amount(
    amount: float,
    NP: bool = True,
    SEMP: bool = False) -> Dict[str, int]:
    '''
    Splitting the amount of funds between three parts: developer, service provider, and country.
    90% - the service provider receives
    10% - the developer receives
    n% (depending on the type of sole proprietor) of the percentage
    if it's a sole proprietor, then
    n% of the percentage the developer receives
    if it's a self-employed person, then n% of the total cost
    '''
    100

    total = Decimal(amount)
    
    platform_percent = Decimal('0.10')
    platform_amount = (total * platform_percent).quantize(Decimal('0.01'))
    
    seller_gross_percent = Decimal('0.90')
    seller_gross = (total * seller_gross_percent).quantize(Decimal('0.01'))
    
    tax_percent = Decimal('0.06')
    tax_amount = (seller_gross * tax_percent).quantize(Decimal('0.01'))
    
    seller_net = seller_gross - tax_amount
    
    return {
        "total": total,
        "platform_amount": platform_amount,
        "seller_gross": seller_gross,
        "tax_amount": tax_amount,
        "seller_net": seller_net
    }


async def trafic_orkestrator():
    '''
    distribution of all translations in one place
    '''
    check_yukass_credentials()
    pass