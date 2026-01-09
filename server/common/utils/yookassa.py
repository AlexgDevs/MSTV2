from os import getenv
from decimal import Decimal
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import httpx
import base64
import json
import time

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


async def process_payout_to_seller(payment_id: str):
    '''
    function for transferring funds to the seller
    '''
    check_yukass_credentials()
    try:
        payment = await get_payment(payment_id)
        if not payment:
            raise ValueError('Payment not found')

        if payment.get('status') != 'succeeded':
            raise ValueError('Payment not succeeded')

        aggregated = await aggregate_amount(float(payment.get('amount').get('value')))
        seller_amount = aggregated.get('seller_net')
        master_id = payment.get('metadata').get('seller_id')
        if not master_id:
            raise ValueError('seller_id not found')

        async with db_config.Session() as session:
            payment_repo = PaymentRepository(session)
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
                "payout_destination_data": master.account.get_yookassa_payout_data(),
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
                "Idempotence-Key": f"payout_seller_{payment_id}_{int(time.time())}"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payout_data, headers=headers)
                response.raise_for_status()
                result = response.json()

                logger.info(
                    f"Payout to seller {master.id}: {seller_amount} {payment.get('amount').get('currency', 'None')}")
                return {"success": True, "data": result}

    except Exception as e:
        logger.error(f"Error in process_payout_to_seller: {str(e)}")
        return {"success": False, "error": str(e)}


async def process_payout_to_developer(payment_id: str):
    '''
    function for transferring funds to the developer
    '''
    check_yukass_credentials()
    try:
        payment = await get_payment(payment_id)
        if not payment:
            raise ValueError('Payment not found')

        if payment.get('status') != 'succeeded':
            raise ValueError('Payment not succeeded')

        aggregated = await aggregate_amount(float(payment.get('amount').get('value')))
        developer_amount = aggregated.get('platform_amount')

        developer_card = getenv('DEVELOPER_CARD')
        if not developer_card:
            raise ValueError('DEVELOPER_CARD not configured')

        payout_data = {
            "amount": {
                "value": str(developer_amount),
                "currency": "RUB"
            },
            "payout_destination_data": {
                "type": "bank_card",
                "bank_card": {"number": developer_card}
            },
            "description": f"Комиссия платформы за {payment_id}",
            "metadata": {
                "payment_id": payment_id,
                "purpose": "platform_fee"
            }
        }

        url = f"{get_api_url()}/payouts"
        headers = {
            "Authorization": get_auth_header(),
            "Content-Type": "application/json",
            "Idempotence-Key": f"payout_dev_{payment_id}_{int(time.time())}"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payout_data, headers=headers)
            response.raise_for_status()
            result = response.json()

            logger.info(f"Platform fee payout: {developer_amount} RUB")
            return {"success": True, "data": result}

    except Exception as e:
        logger.error(f"Error in process_payout_to_developer: {str(e)}")
        return {"success": False, "error": str(e)}


async def aggregate_amount(amount: float) -> Dict[str, float]:
    '''
    Splitting the amount of funds between developer and service provider
    90% - the service provider receives
    10% - the developer receives
    '''
    total = float(amount)

    platform_percent = 0.10
    platform_amount = round(total * platform_percent, 2)

    seller_gross_percent = 0.90
    seller_gross = round(total * seller_gross_percent, 2)

    tax_percent = 0.06
    tax_amount = round(seller_gross * tax_percent, 2)

    seller_net = round(seller_gross - tax_amount, 2)

    return {
        "total": total,
        "platform_amount": platform_amount,
        "seller_gross": seller_gross,
        "tax_amount": tax_amount,
        "seller_net": seller_net
    }


async def trafic_orchestrator(payment_id: str):
    '''
    distribution of all translations in one place
    '''
    check_yukass_credentials()
    try:
        seller_result = await process_payout_to_seller(payment_id)
        if not seller_result.get('success'):
            return {"success": False, "error": "Seller payout failed", "details": seller_result}

        developer_result = await process_payout_to_developer(payment_id)
        if not developer_result.get('success'):
            return {"success": False, "error": "Developer payout failed", "details": developer_result}

        return {
            "success": True,
            "payment_id": payment_id,
            "seller_payout": seller_result,
            "developer_payout": developer_result,
            "message": "All payouts completed successfully"
        }

    except Exception as e:
        logger.error(f"Error in trafic_orchestrator: {str(e)}")
        return {"success": False, "error": str(e)}


async def dispute_orchestrator(payment_id: str, winner_type: str):
    '''
    Distribution of funds based on dispute resolution
    winner_type: 'client' - full refund to client
                 'master' - full payout to master (without platform fee)
                 'split' - 50% refund to client, 50% payout to master
    '''
    check_yukass_credentials()
    try:
        payment = await get_payment(payment_id)
        if not payment:
            raise ValueError('Payment not found')

        if payment.get('status') != 'succeeded':
            raise ValueError('Payment not succeeded')

        payment_amount = float(payment.get('amount').get('value'))
        results = {}

        if winner_type == 'client':
            # Full refund to client
            refund_result = await create_refund(
                payment_id=payment_id,
                description=f'Полный возврат по решению арбитража'
            )
            results['refund'] = {"success": True, "data": refund_result}
            results['message'] = "Full refund to client completed"
            logger.info(
                f"Dispute resolution: Full refund to client for payment {payment_id}")

        elif winner_type == 'master':
            # Full payout to master (100% of amount, including platform fee)
            # Get master data
            master_id = payment.get('metadata', {}).get('seller_id')
            if not master_id:
                raise ValueError('seller_id not found in payment metadata')

            async with db_config.Session() as session:
                payment_repo = PaymentRepository(session)
                master = await payment_repo.get_seller_id(int(master_id))
                if not master or not master.account:
                    raise ValueError('Master account not found')

                # Payout full amount to master (100%)
                # Format amount with 2 decimal places for YooKassa API
                payout_data = {
                    "amount": {
                        # Format with 2 decimal places
                        "value": f"{payment_amount:.2f}",
                        "currency": "RUB"
                    },
                    "payout_destination_data": master.account.get_yookassa_payout_data(),
                    "description": f"Полная выплата за заказ {payment_id} по решению арбитража",
                    "metadata": {
                        "payment_id": payment_id,
                        "seller_id": master.id,
                        "purpose": "dispute_master_full_payout"
                    }
                }

                url = f"{get_api_url()}/payouts"
                headers = {
                    "Authorization": get_auth_header(),
                    "Content-Type": "application/json",
                    "Idempotence-Key": f"payout_dispute_master_{payment_id}_{int(time.time())}"
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=payout_data, headers=headers)
                    response.raise_for_status()
                    payout_result = response.json()

                    results['master_payout'] = {
                        "success": True, "data": payout_result}
                    results['message'] = "Full payout to master completed (100% including platform fee)"
                    logger.info(
                        f"Dispute resolution: Full payout to master for payment {payment_id} - {payment_amount} RUB")

        elif winner_type == 'split':
            # 50% to client (refund), 50% to master (payout)
            # Calculate half amount with precision to kopecks
            half_amount = round(payment_amount / 2, 2)

            # For refund use floor rounding to whole rubles
            # (to avoid issues with kopecks in refund API)
            refund_amount_rubles = int(half_amount)

            # For payout use remaining amount (including kopecks)
            # This guarantees that refund + payout = payment_amount exactly
            payout_amount = round(payment_amount - refund_amount_rubles, 2)

            # Refund 50% to client (rounded down to rubles)
            refund_result = await create_refund(
                payment_id=payment_id,
                amount=refund_amount_rubles,  # In rubles (int)
                description=f'Частичный возврат 50% по решению арбитража'
            )
            results['refund'] = {"success": True, "data": refund_result}

            master_id = payment.get('metadata', {}).get('seller_id')
            if not master_id:
                raise ValueError('seller_id not found in payment metadata')

            async with db_config.Session() as session:
                from ...payments.repositories import PaymentRepository
                payment_repo = PaymentRepository(session)
                master = await payment_repo.get_seller_id(int(master_id))
                if not master or not master.account:
                    raise ValueError('Master account not found')

                payout_data = {
                    "amount": {
                        "value": f"{payout_amount:.2f}",
                        "currency": "RUB"
                    },
                    "payout_destination_data": master.account.get_yookassa_payout_data(),
                    "description": f"Выплата 50% за заказ {payment_id} по решению арбитража",
                    "metadata": {
                        "payment_id": payment_id,
                        "seller_id": master.id,
                        "purpose": "dispute_split_payout"
                    }
                }

                url = f"{get_api_url()}/payouts"
                headers = {
                    "Authorization": get_auth_header(),
                    "Content-Type": "application/json",
                    "Idempotence-Key": f"payout_dispute_split_{payment_id}_{int(time.time())}"
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=payout_data, headers=headers)
                    response.raise_for_status()
                    payout_result = response.json()

                    results['master_payout'] = {
                        "success": True, "data": payout_result}
                    results['message'] = "Split payment completed: 50% refund to client, 50% payout to master"
                    logger.info(
                        f"Dispute resolution: Split payment for {payment_id} - 50% refund, 50% payout")
        else:
            raise ValueError(f'Invalid winner_type: {winner_type}')

        return {
            "success": True,
            "payment_id": payment_id,
            "winner_type": winner_type,
            **results
        }

    except Exception as e:
        logger.error(f"Error in dispute_orchestrator: {str(e)}")
        return {"success": False, "error": str(e)}
