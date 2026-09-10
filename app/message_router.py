import logging
from typing import Optional, List
from app.config import settings
from app import output_guard

logger = logging.getLogger(__name__)


def get_provider(client_config: Optional[dict] = None) -> str:
    """
    Determine messaging provider.

    This deployment runs exclusively on the official WhatsApp Cloud API.
    A per-client override is still honoured (in case a client row explicitly
    sets one), but the default and only supported provider is whatsapp_cloud.
    """
    provider = settings.MESSAGING_PROVIDER or "whatsapp_cloud"
    if client_config and client_config.get("messaging_provider"):
        provider = client_config["messaging_provider"]
    return provider


# ─── Text messages ────────────────────────────────────────────────────────────

async def send_message(
    phone: str,
    text: str,
    client_config: Optional[dict] = None,
) -> dict | None:
    text = output_guard.guard_outgoing(text, phone)
    output_guard.log_violations(phone, text)
    provider = get_provider(client_config)

    if provider == "whatsapp_cloud":
        from app import whatsapp_client as cloud
        return await cloud.send_message(phone, text, client_config=client_config)

    logger.error("[Router] Unsupported messaging provider '%s'. Only whatsapp_cloud is supported.", provider)
    return None


# ─── Typing indicator ─────────────────────────────────────────────────────────

async def send_typing_indicator(
    phone: str,
    message_id: str = "",
    client_config: Optional[dict] = None,
) -> bool:
    provider = get_provider(client_config)

    if provider == "whatsapp_cloud":
        from app import whatsapp_client as cloud
        return await cloud.send_typing_indicator(phone, message_id=message_id, client_config=client_config)

    return False


# ─── Mark as read (blue ticks) ────────────────────────────────────────────────

async def mark_as_read(
    phone: str,
    message_id: str,
    client_config: Optional[dict] = None,
) -> bool:
    provider = get_provider(client_config)

    if provider == "whatsapp_cloud":
        from app import whatsapp_client as cloud
        await cloud.mark_as_read(message_id, client_config=client_config)
        return True

    return False


# ─── Chunked messages ─────────────────────────────────────────────────────────

async def send_chunked_messages(
    phone: str,
    chunks: list[str],
    client_config: Optional[dict] = None,
    incoming_text: str = "",
    last_message_ts: float = 0,
    message_id: str = "",
) -> None:
    from app.human_behavior import deliver_outbound_sequence
    await deliver_outbound_sequence(phone, chunks, client_config=client_config)


# ─── Template messages ────────────────────────────────────────────────────────

async def send_template_message(
    phone: str,
    client_config: Optional[dict] = None,
    template_name: Optional[str] = None,
    language_code: str = "en_GB",
    components: Optional[list] = None,
) -> dict | None:
    provider = get_provider(client_config)
    final_template = template_name or (
        client_config.get("outreach_template_name") if client_config else "markeye_outreach"
    )

    if provider == "whatsapp_cloud":
        from app import whatsapp_client as cloud
        return await cloud.send_template_message(phone, final_template, language_code, components, client_config=client_config)

    logger.info("[Router] Templates only supported on whatsapp_cloud. Skipping.")
    return None


# ─── Media ────────────────────────────────────────────────────────────────────

async def send_media(
    phone: str,
    media_url: str,
    media_type: str = "document",
    caption: str = "",
    client_config: Optional[dict] = None,
) -> dict | None:
    logger.warning("[Router] Media via whatsapp_cloud not fully implemented.")
    return None


# ─── Polls ────────────────────────────────────────────────────────────────────

async def send_poll(
    phone: str,
    question: str,
    options: List[str],
    client_config: Optional[dict] = None,
) -> dict | None:
    logger.info("[Router] Polls not supported on Cloud API. Skipping.")
    return None


# ─── Forward (escalation) ─────────────────────────────────────────────────────

async def forward_message(
    phone: str,
    original_msg_id: str,
    forward_to: str,
    client_config: Optional[dict] = None,
) -> dict | None:
    logger.info("[Router] Forwarding not supported on Cloud API.")
    return None
