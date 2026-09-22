"""URL de guía en nfctap.tech según el dolor del Reel. Un tema = una página, no un artículo por vídeo."""

from nfctap_media.script import Pain

SITE = "https://nfctap.tech"

BY_PAIN = {
    "se_van_sin_opinar": "atril-nfc-resenas-google",
    "maps_abajo": "atril-nfc-resenas-google",
    "no_piden": "atril-nfc-resenas-google",
    "ficha_vacia": "atril-nfc-resenas-google",
    "flyer_suelo": "atril-nfc-resenas-google",
    "una_en_caja": "atril-nfc-resenas-google",
    "qr_sucio": "nfc-o-qr-hosteleria",
    "papel_mojado": "nfc-o-qr-hosteleria",
    "veinte_vs_anuncio": "nfc-o-qr-hosteleria",
    "factura_ads": "nfc-o-qr-hosteleria",
    "mes_vs_atril": "nfc-o-qr-hosteleria",
    "whatsapp_no_entra": "atril-nfc-whatsapp-instagram",
    "instagram_no_siguen": "atril-nfc-whatsapp-instagram",
    "mi_logo": "atril-nfc-whatsapp-instagram",
    "pack_mixto": "atril-nfc-whatsapp-instagram",
    "dos_en_barra": "atril-nfc-whatsapp-instagram",
}

BY_THEME = {
    "reseñas": "atril-nfc-resenas-google",
    "reservas": "atril-nfc-whatsapp-instagram",
    "marca": "atril-nfc-whatsapp-instagram",
    "precio": "nfc-o-qr-hosteleria",
}


def guide_path(pain: Pain) -> str:
    slug = BY_PAIN.get(pain.id) or BY_THEME.get(pain.theme) or "atril-nfc-resenas-google"
    return f"/guia/{slug}"


def guide_url(pain: Pain) -> str:
    return f"{SITE}{guide_path(pain)}"
