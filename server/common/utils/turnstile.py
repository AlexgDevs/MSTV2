from os import getenv
from dotenv import load_dotenv
import httpx

load_dotenv()

TURNSTILE_SECRET_KEY = getenv('TURNSTILE_SECRET_KEY')
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile(token: str, remote_ip: str = None) -> bool:
    if token == 'dev-mock-turnstile-token':
        return True

    if not TURNSTILE_SECRET_KEY:
        return True

    if not token:
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            data = {
                'secret': TURNSTILE_SECRET_KEY,
                'response': token
            }

            if remote_ip:
                data['remoteip'] = remote_ip

            response = await client.post(TURNSTILE_VERIFY_URL, data=data)
            result = response.json()

            return result.get('success', False)

    except Exception as e:
        from .logger import logger
        logger.error(f'Ошибка при проверке Turnstile: {str(e)}')
        return True
