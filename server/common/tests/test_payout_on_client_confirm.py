import asyncio
from dataclasses import dataclass
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest


@dataclass
class FakePayment:
    id: int
    enroll_id: int
    yookassa_payment_id: str
    status: str = "processing"
    yookassa_status: str = "waiting_for_capture"
    amount: int = 1000
    paid_at: str | None = None


@pytest.mark.asyncio
async def test_process_payout_for_completed_enroll_captures_then_runs_orchestrator(monkeypatch):
    """
    Сценарий: клиент подтвердил выполнение -> enroll.completed -> запускается payout.
    Если платеж в YooKassa waiting_for_capture, сначала делаем capture, потом запускаем оркестратор.
    """
    from server.payments.usecases.payment_usecase import PaymentUseCase
    import server.payments.usecases.payment_usecase as payment_usecase_mod

    payment = FakePayment(id=1, enroll_id=10, yookassa_payment_id="pay_123")

    payment_repo = SimpleNamespace(
        get_by_enroll_id=AsyncMock(return_value=payment),
        update_payment=AsyncMock(return_value=None),
    )
    session = SimpleNamespace(commit=AsyncMock(return_value=None))

    yk_get = AsyncMock(
        return_value={"id": "pay_123", "status": "waiting_for_capture"})
    yk_capture = AsyncMock(return_value={
                           "id": "pay_123", "status": "succeeded", "paid_at": "2026-01-01T00:00:00Z"})
    yk_orchestrator = AsyncMock(return_value={"success": True})

    monkeypatch.setattr(payment_usecase_mod, "yookassa_get_payment", yk_get)
    monkeypatch.setattr(payment_usecase_mod,
                        "yookassa_capture_payment", yk_capture)
    monkeypatch.setattr(payment_usecase_mod,
                        "yookass_trafic_orchestrator", yk_orchestrator)

    tasks: list[asyncio.Task] = []

    def fake_create_task(coro):
        task = asyncio.create_task(coro)
        tasks.append(task)
        return task

    monkeypatch.setattr(payment_usecase_mod, "create_task", fake_create_task)

    usecase = PaymentUseCase(session=session, payment_repository=payment_repo)
    result = await usecase.process_payout_for_completed_enroll(enroll_id=10)

    assert result["status"] == "success"
    assert result["message"] == "Payout process started"

    yk_get.assert_awaited_once_with("pay_123")
    yk_capture.assert_awaited_once_with("pay_123")
    payment_repo.update_payment.assert_awaited()
    session.commit.assert_awaited()

    # background task must be scheduled and run
    assert tasks, "Expected background task to be scheduled"
    await asyncio.gather(*tasks)
    yk_orchestrator.assert_awaited_once_with("pay_123")


@pytest.mark.asyncio
async def test_confirm_enroll_by_client_triggers_payment_usecase(monkeypatch):
    """
    Сценарий: клиент подтверждает (enroll.ready -> enroll.completed) и вызывается PaymentUseCase.process_payout_for_completed_enroll.
    """
    from server.enrolls.usecases.booking_usecase import BookingUseCase

    enroll = SimpleNamespace(id=10, user_id=77, status="ready", service_id=5)

    enroll_repo = SimpleNamespace(
        get_by_id=AsyncMock(return_value=enroll),
    )

    # В confirm_enroll_by_client не проверяется service ownership, но updated_enroll читается снова
    enroll_repo.get_by_id.side_effect = [enroll, SimpleNamespace(
        id=10, user_id=77, status="completed", service_id=5)]

    payment_usecase = SimpleNamespace(
        process_payout_for_completed_enroll=AsyncMock(
            return_value={"status": "success"})
    )

    session = SimpleNamespace(
        merge=AsyncMock(return_value=None),
        commit=AsyncMock(return_value=None),
        rollback=AsyncMock(return_value=None),
        expire_all=lambda: None,
    )

    booking = BookingUseCase(
        session=session,
        enroll_repository=enroll_repo,
        service_date_repository=SimpleNamespace(),
        payment_repository=SimpleNamespace(),
        payment_usecase=payment_usecase,
    )

    updated = await booking.confirm_enroll_by_client(enroll_id=10, client_id=77)

    assert updated.status == "completed"
    payment_usecase.process_payout_for_completed_enroll.assert_awaited_once_with(
        10)
