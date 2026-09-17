"""GSTIN and bank sandbox verification. Swap these functions for live APIs later."""
import re
from datetime import datetime, timezone

GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


def verify_gstin_sandbox(gstin, business_name=""):
    gstin = (gstin or "").strip().upper()
    valid_format = bool(GSTIN_RE.match(gstin))
    # Sandbox: accept well-formed GSTINs; flag obviously fake prefixes
    blocked = gstin.startswith("00")
    verified = valid_format and not blocked
    return {
        "gstin": gstin,
        "business_name": business_name,
        "format_valid": valid_format,
        "verified": verified,
        "source": "sandbox_gstin_mock",
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "message": "GSTIN verified in sandbox" if verified else "GSTIN could not be verified",
    }


def verify_bank_sandbox(account_ref):
    ref = (account_ref or "").strip()
    ok = len(ref) >= 4
    return {
        "bank_account_ref": ref[-4:] if ref else "",
        "verified": ok,
        "source": "sandbox_bank_mock",
        "message": "Account matched in sandbox" if ok else "Account reference too short",
    }
