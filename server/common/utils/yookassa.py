import json
import hmac
import hashlib
from os import getenv
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import uuid
import asyncio
from functools import partial

from yookassa import Configuration, Payment, Deal
from yookassa.domain.notification import WebhookNotificationFactory

from .logger import logger
from ..db import db_config
from ...payments.repositories import PaymentRepository

load_dotenv()

YUKASSA_SHOP_ID = getenv('YUKASSA_SHOP_ID')
YUKASSA_SECRET_KEY = getenv('YUKASSA_SECRET_KEY')

PLATFORM_FEE_PERCENT = Decimal(getenv('PLATFORM_FEE_PERCENT', '0.10'))

IS_TEST_MODE = YUKASSA_SECRET_KEY and YUKASSA_SECRET_KEY.startswith('test_')

Configuration.account_id = YUKASSA_SHOP_ID
Configuration.secret_key = YUKASSA_SECRET_KEY


def check_yukass_credentials():
    """Check if YooKassa credentials are configured"""
    if not YUKASSA_SHOP_ID or not YUKASSA_SECRET_KEY:
        raise ValueError("YUKASSA credentials not configured")


def format_for_yookassa(decimal_amount: Decimal) -> str:
    """Format amount for YooKassa API"""
    return str(decimal_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


async def aggregate_amount(amount: float) -> Dict[str, str]:
    """
    Split amount between platform and seller
    Returns string values formatted for YooKassa API
    """
    total = Decimal(str(amount))
    platform_amount = total * PLATFORM_FEE_PERCENT
    seller_amount = total - platform_amount

    return {
        "total": format_for_yookassa(total),
        "platform_fee_percent": str(PLATFORM_FEE_PERCENT),
        'platform_amount': format_for_yookassa(platform_amount),
        'seller_amount': format_for_yookassa(seller_amount)
    }


def _run_sync(func, *args, **kwargs):
    """Run synchronous function in a separate thread"""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(None, partial(func, *args, **kwargs))


async def create_deal(
    amount: float,
    description: str,
    fee_moment: str = "deal_closed"
) -> Dict[str, Any]:
    """
    Create a deal in YooKassa for safe deal (self deal)

    Args:
        amount: Total deal amount
        description: Deal description
        fee_moment: When platform receives commission: "payment_succeeded" or "deal_closed"

    Returns:
        Dictionary with created deal data

    Raises:
        ValueError: If safe deal is not enabled in the store
    """
    check_yukass_credentials()

    try:
        amount_str = format_for_yookassa(Decimal(str(amount)))

        deal_data = {
            "type": "safe_deal",
            "fee_moment": fee_moment,
            "description": description
        }

        deal = await _run_sync(Deal.create, deal_data)

        logger.info(f"Deal created in Yookassa: {deal.id}")
        return {
            'id': deal.id,
            'type': deal.type,
            'status': deal.status,
            'fee_moment': deal.fee_moment,
            'description': deal.description,
            'created_at': deal.created_at.isoformat() if hasattr(deal, 'created_at') and deal.created_at else None
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error creating deal: {error_msg}")

        if "safe_deal" in error_msg.lower() or "безопасная сделка" in error_msg.lower() or "safe deal" in error_msg.lower():
            raise ValueError(
                "Безопасная сделка (Safe Deal) не подключена в вашем магазине ЮКассы. "
                "Для подключения в тестовом режиме:\n"
                "1. Напишите менеджеру ЮКассы для активации Safe Deal в тестовом магазине\n"
                "2. Или подключите Safe Deal через личный кабинет ЮКассы\n"
                "3. Убедитесь, что используете правильные shop_id и secret_key для магазина с подключенной Safe Deal"
            ) from e

        raise


async def create_payment(
    amount: int,
    description: str,
    return_url: str,
    deal_id: str,
    seller_amount: float,
    metadata: Optional[Dict[str, Any]] = None,
    capture: bool = False,
) -> Dict[str, Any]:
    """
    Create payment with deal binding (self deal)

    Args:
        amount: Payment amount in rubles (int)
        description: Payment description
        return_url: Return URL after payment
        deal_id: Previously created deal ID
        seller_amount: Amount that will go to seller (in rubles, float)
        metadata: Additional metadata
        capture: Automatic payment confirmation (False for two-step payment)

    Returns:
        Dictionary with created payment data
    """
    check_yukass_credentials()

    try:
        amount_str = format_for_yookassa(Decimal(str(amount)))
        seller_amount_str = format_for_yookassa(Decimal(str(seller_amount)))

        payment_data = {
            "amount": {
                "value": amount_str,
                "currency": "RUB"
            },
            "confirmation": {
                "type": "redirect",
                "return_url": return_url
            },
            "capture": capture,
            "description": description,
            "deal": {
                "id": deal_id,
                "settlements": [
                    {
                        "type": "payout",
                        "amount": {
                            "value": seller_amount_str,
                            "currency": "RUB"
                        }
                    }
                ]
            }
        }

        if metadata:
            payment_data["metadata"] = metadata

        idempotence_key = metadata.get("idempotence_key", str(
            uuid.uuid4())) if metadata else str(uuid.uuid4())

        payment = await _run_sync(Payment.create, payment_data, idempotence_key)

        logger.info(
            f"Payment created in Yookassa: {payment.id} with deal {deal_id}")

        result = {
            'id': payment.id,
            'status': payment.status,
            'amount': {
                'value': str(payment.amount.value),
                'currency': payment.amount.currency
            },
            'description': payment.description,
            'metadata': payment.metadata if hasattr(payment, 'metadata') else {},
            'paid': payment.paid,
            'created_at': payment.created_at.isoformat() if hasattr(payment, 'created_at') and payment.created_at else None,
            'paid_at': payment.paid_at.isoformat() if hasattr(payment, 'paid_at') and payment.paid_at else None,
        }

        if hasattr(payment, 'confirmation') and payment.confirmation:
            if hasattr(payment.confirmation, 'confirmation_url'):
                result['confirmation'] = {
                    'confirmation_url': payment.confirmation.confirmation_url,
                    'type': payment.confirmation.type
                }

        return result

    except Exception as e:
        logger.error(f"Error creating payment: {str(e)}")
        raise


async def get_payment(payment_id: str) -> Dict[str, Any]:
    """
    Get payment information
    """
    check_yukass_credentials()

    try:
        payment = await _run_sync(Payment.find_one, payment_id)

        result = {
            'id': payment.id,
            'status': payment.status,
            'amount': {
                'value': str(payment.amount.value),
                'currency': payment.amount.currency
            },
            'description': payment.description,
            'metadata': payment.metadata if hasattr(payment, 'metadata') else {},
            'paid': payment.paid,
            'created_at': payment.created_at.isoformat() if hasattr(payment, 'created_at') and payment.created_at else None,
            'paid_at': payment.paid_at.isoformat() if hasattr(payment, 'paid_at') and payment.paid_at else None,
        }

        if hasattr(payment, 'confirmation') and payment.confirmation:
            if hasattr(payment.confirmation, 'confirmation_url'):
                result['confirmation'] = {
                    'confirmation_url': payment.confirmation.confirmation_url,
                    'type': payment.confirmation.type
                }

        if hasattr(payment, 'deal') and payment.deal:
            result['deal'] = {
                'id': payment.deal.id if hasattr(payment.deal, 'id') else None
            }

        return result

    except Exception as e:
        logger.error(f"Error getting payment: {str(e)}")
        raise


async def capture_payment(payment_id: str, amount: Optional[int] = None) -> Dict[str, Any]:
    """
    Confirm payment (transfer funds to store)
    """
    check_yukass_credentials()

    try:
        capture_data = {}
        if amount:
            amount_str = format_for_yookassa(Decimal(str(amount)))
            capture_data["amount"] = {
                "value": amount_str,
                "currency": "RUB"
            }

        idempotence_key = f"capture_{payment_id}_{uuid.uuid4()}"
        payment = await _run_sync(Payment.capture, payment_id, capture_data, idempotence_key)

        result = {
            'id': payment.id,
            'status': payment.status,
            'amount': {
                'value': str(payment.amount.value),
                'currency': payment.amount.currency
            },
            'paid': payment.paid,
            'paid_at': payment.paid_at.isoformat() if hasattr(payment, 'paid_at') and payment.paid_at else None,
        }

        logger.info(f"Payment {payment_id} captured successfully")
        return result

    except Exception as e:
        logger.error(f"Error capturing payment: {str(e)}")
        raise


async def cancel_payment(payment_id: str) -> Dict[str, Any]:
    """
    Cancel payment
    """
    check_yukass_credentials()

    try:
        idempotence_key = f"cancel_{payment_id}_{uuid.uuid4()}"
        payment = await _run_sync(Payment.cancel, payment_id, idempotence_key)

        result = {
            'id': payment.id,
            'status': payment.status,
        }

        logger.info(f"Payment {payment_id} canceled")
        return result

    except Exception as e:
        logger.error(f"Error canceling payment: {str(e)}")
        raise


async def get_deal(deal_id: str) -> Dict[str, Any]:
    """
    Get deal information
    """
    check_yukass_credentials()

    try:
        deal = await _run_sync(Deal.find_one, deal_id)

        result = {
            'id': deal.id,
            'type': deal.type,
            'status': deal.status,
            'fee_moment': deal.fee_moment,
            'description': deal.description,
            'created_at': deal.created_at.isoformat() if hasattr(deal, 'created_at') and deal.created_at else None,
        }

        if hasattr(deal, 'balance'):
            result['balance'] = {
                'value': str(deal.balance.value) if hasattr(deal.balance, 'value') else None,
                'currency': deal.balance.currency if hasattr(deal.balance, 'currency') else None
            }

        return result

    except Exception as e:
        logger.error(f"Error getting deal: {str(e)}")
        raise


async def close_deal(deal_id: str) -> Dict[str, Any]:
    """
    Close deal - automatically distributes funds:
    - Seller receives their share (specified in settlements)
    - Platform automatically receives commission (10%)

    Called after client confirms order
    """
    check_yukass_credentials()

    try:
        deal = await _run_sync(Deal.close, deal_id)

        result = {
            'id': deal.id,
            'status': deal.status,
            'type': deal.type,
        }

        if hasattr(deal, 'balance'):
            result['balance'] = {
                'value': str(deal.balance.value) if hasattr(deal.balance, 'value') else None,
                'currency': deal.balance.currency if hasattr(deal.balance, 'currency') else None
            }

        logger.info(
            f"Deal {deal_id} closed successfully. Funds distributed automatically.")
        return result

    except Exception as e:
        logger.error(f"Error closing deal: {str(e)}")
        raise


async def create_refund(
    payment_id: str,
    amount: Optional[int] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create refund to client
    """
    check_yukass_credentials()

    try:
        from yookassa import Refund

        refund_data = {
            "payment_id": payment_id
        }

        if amount:
            amount_str = format_for_yookassa(Decimal(str(amount)))
            refund_data["amount"] = {
                "value": amount_str,
                "currency": "RUB"
            }

        if description:
            refund_data["description"] = description

        idempotence_key = f"refund_{payment_id}_{uuid.uuid4()}"
        refund = await _run_sync(Refund.create, refund_data, idempotence_key)

        result = {
            'id': refund.id,
            'status': refund.status,
            'amount': {
                'value': str(refund.amount.value),
                'currency': refund.amount.currency
            },
            'payment_id': refund.payment_id,
        }

        logger.info(f"Refund created for payment {payment_id}: {refund.id}")
        return result

    except Exception as e:
        logger.error(f"Error creating refund: {str(e)}")
        raise


def verify_webhook_signature(
    data: Dict[str, Any],
    signature: str,
    webhook_secret: Optional[str] = None
) -> bool:
    """
    Verify YooKassa webhook signature using HMAC-SHA256
    """
    if not data or not signature:
        return False

    if webhook_secret is None:
        webhook_secret = getenv('YUKASSA_WEBHOOK_SECRET')

    if not webhook_secret:
        logger.error("YUKASSA_WEBHOOK_SECRET not configured")
        return False

    event = data.get('event')
    payment_object = data.get('object', {})

    if not event or not payment_object:
        return False

    valid_events = [
        'payment.succeeded',
        'payment.canceled',
        'payment.waiting_for_capture',
        'refund.succeeded',
        'deal.closed'
    ]

    if event not in valid_events:
        logger.warning(f"Invalid webhook event type: {event}")
        return False

    if not payment_object.get('id'):
        return False

    try:
        data_string = json.dumps(data, separators=(',', ':'), sort_keys=False)

        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            data_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    except Exception as e:
        logger.error(f"Webhook signature verification error: {str(e)}")
        return False


def parse_webhook(data: Dict[str, Any]) -> Any:
    """
    Parse YooKassa webhook using library
    """
    try:
        notification = WebhookNotificationFactory().create(data)
        return notification
    except Exception as e:
        logger.error(f"Error parsing webhook: {str(e)}")
        raise


async def process_payment_with_deal(
    amount: int,
    description: str,
    return_url: str,
    seller_amount: float,
    metadata: Optional[Dict[str, Any]] = None,
    capture: bool = False,
) -> Dict[str, Any]:
    """
    Create payment and deal in one call (convenience function)

    Args:
        amount: Total payment amount in rubles (int)
        description: Payment description
        return_url: Return URL after payment
        seller_amount: Amount that will go to seller (in rubles, float)
        metadata: Additional metadata
        capture: Automatic payment confirmation

    Returns:
        Dictionary with payment and deal data
    """
    check_yukass_credentials()

    try:
        deal = await create_deal(
            amount=float(amount),
            description=description,
            fee_moment="deal_closed"
        )

        payment = await create_payment(
            amount=amount,
            description=description,
            return_url=return_url,
            deal_id=deal['id'],
            seller_amount=seller_amount,
            metadata=metadata,
            capture=capture
        )

        logger.info(f"Payment {payment['id']} created with deal {deal['id']}")

        return {
            'payment': payment,
            'deal': deal
        }

    except Exception as e:
        logger.error(f"Error creating payment with deal: {str(e)}")
        raise
        raise


async def process_deal_closure(payment_id: str) -> Dict[str, Any]:
    """
    Process deal closure after client confirms order

    Process:
    1. Get payment information
    2. Extract deal ID
    3. Close deal
    4. On closure, funds are automatically distributed:
       - Seller receives their share
       - Platform receives commission (10%)

    Args:
        payment_id: Payment ID in YooKassa

    Returns:
        Deal closure result
    """
    check_yukass_credentials()

    try:
        payment = await get_payment(payment_id)

        if not payment:
            raise ValueError('Payment not found')

        if payment.get('status') != 'succeeded':
            raise ValueError(
                f'Payment not succeeded, current status: {payment.get("status")}')

        deal_id = None
        if 'deal' in payment and payment['deal']:
            deal_id = payment['deal'].get('id')

        if not deal_id:
            raise ValueError('Deal ID not found in payment')

        result = await close_deal(deal_id)

        logger.info(
            f"Deal {deal_id} closed for payment {payment_id}. Funds distributed automatically.")

        return {
            "success": True,
            "payment_id": payment_id,
            "deal_id": deal_id,
            "deal_status": result.get('status'),
            "message": "Deal closed successfully. Funds distributed to seller and platform automatically."
        }

    except Exception as e:
        logger.error(f"Error processing deal closure: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def process_payout_to_seller(payment_id: str):
    """
    DEPRECATED: Use process_deal_closure instead.
    With self deal, payouts happen automatically when deal is closed.
    """
    logger.warning(
        "process_payout_to_seller is deprecated. Use process_deal_closure instead.")
    return await process_deal_closure(payment_id)


async def process_payout_to_developer(payment_id: str):
    """
    DEPRECATED: With self deal, platform fee is automatically calculated when deal is closed.
    """
    logger.warning(
        "process_payout_to_developer is deprecated. Platform fee is automatically calculated when deal is closed.")
    return {
        "success": True,
        "message": "Platform fee is automatically calculated when deal is closed"
    }


async def trafic_orchestrator(payment_id: str):
    """
    DEPRECATED: Use process_deal_closure instead.
    With self deal, all payouts happen automatically when deal is closed.
    """
    logger.warning(
        "trafic_orchestrator is deprecated. Use process_deal_closure instead.")
    return await process_deal_closure(payment_id)


async def dispute_orchestrator(payment_id: str, winner_type: str):
    """
    Distribute funds based on arbitration decision

    winner_type: 'client' - full refund to client
                'master' - full payout to master (without platform commission)
                'split' - 50% refund to client, 50% payout to master

    Note: With self deal, need to close or cancel deal first,
    then perform refund or payout.
    """
    check_yukass_credentials()

    try:
        payment = await get_payment(payment_id)
        if not payment:
            raise ValueError('Payment not found')

        if payment.get('status') != 'succeeded':
            raise ValueError('Payment not succeeded')

        payment_amount = float(payment.get('amount', {}).get('value', 0))
        results = {}

        if winner_type == 'client':
            refund_result = await create_refund(
                payment_id=payment_id,
                description='Full refund by arbitration decision'
            )
            results['refund'] = {"success": True, "data": refund_result}
            results['message'] = "Full refund to client completed"
            logger.info(
                f"Dispute resolution: Full refund to client for payment {payment_id}")

        elif winner_type == 'master':
            deal_id = None
            if 'deal' in payment and payment['deal']:
                deal_id = payment['deal'].get('id')

            if deal_id:
                deal_result = await close_deal(deal_id)
                results['deal_closed'] = {"success": True, "data": deal_result}
                results['message'] = "Deal closed - master received payout, platform received fee"
            else:
                logger.warning("No deal found, using legacy payout method")
                master_id = payment.get('metadata', {}).get('seller_id')
                if not master_id:
                    raise ValueError('seller_id not found in payment metadata')

                async with db_config.Session() as session:
                    payment_repo = PaymentRepository(session)
                    master = await payment_repo.get_seller_id(int(master_id))
                    if not master or not master.account:
                        raise ValueError('Master account not found')

                    results['message'] = "Master payout should be handled through deal closure"

            logger.info(
                f"Dispute resolution: Full payout to master for payment {payment_id}")

        elif winner_type == 'split':
            half_amount = round(payment_amount / 2, 2)
            refund_amount_rubles = int(half_amount)

            refund_result = await create_refund(
                payment_id=payment_id,
                amount=refund_amount_rubles,
                description='Partial refund 50% by arbitration decision'
            )
            results['refund'] = {"success": True, "data": refund_result}

            deal_id = None
            if 'deal' in payment and payment['deal']:
                deal_id = payment['deal'].get('id')

            if deal_id:
                deal_result = await close_deal(deal_id)
                results['deal_closed'] = {"success": True, "data": deal_result}
                results['message'] = "Split payment completed: 50% refund to client, 50% via deal closure"
            else:
                results['message'] = "Split payment: 50% refund to client, master payout should be handled separately"

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
