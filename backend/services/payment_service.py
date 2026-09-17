"""Escrow hold-and-release state machine (Razorpay/Cashfree sandbox)."""
from datetime import datetime, timezone

STATES = ["listed", "matched", "in_transit", "delivered", "payment_released"]

ALLOWED = {
    "listed": ["matched"],
    "matched": ["in_transit"],
    "in_transit": ["delivered"],
    "delivered": ["payment_released"],
    "payment_released": [],
}


def razorpay_cashfree_sandbox_hold(order, amount):
    return {
        "gateway": "razorpay_cashfree_sandbox",
        "action": "escrow_hold",
        "amount": amount,
        "reference": f"ESCROW-{order.get('_id', 'new')}",
        "held_at": datetime.now(timezone.utc).isoformat(),
    }


def razorpay_cashfree_sandbox_release(order):
    return {
        "gateway": "razorpay_cashfree_sandbox",
        "action": "escrow_release",
        "amount": order.get("total_amount"),
        "farmer_bank_ref": order.get("farmer_bank_ref"),
        "released_at": datetime.now(timezone.utc).isoformat(),
    }


def transition(current, nxt):
    current = current or "listed"
    if nxt not in ALLOWED.get(current, []):
        return False, f"Cannot move from {current} to {nxt}"
    return True, nxt


def apply_order_status(order, delivery_status=None, payment_status=None):
    delivery_status = delivery_status or order.get("delivery_status")
    payment_status = payment_status or order.get("payment_status")
    events = []
    if delivery_status == "matched" and payment_status in (None, "unpaid", "pending"):
        payment_status = "escrow_held"
        events.append(razorpay_cashfree_sandbox_hold(order, order.get("total_amount")))
    if delivery_status == "delivered" and payment_status == "escrow_held":
        # wait for explicit payment_released
        pass
    if delivery_status == "payment_released" or payment_status == "released":
        delivery_status = "payment_released"
        payment_status = "released"
        events.append(razorpay_cashfree_sandbox_release(order))
    return delivery_status, payment_status, events
