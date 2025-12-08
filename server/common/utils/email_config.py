from os import getenv
from random import randint
from dotenv import load_dotenv
from smtplib import SMTP
from email.message import EmailMessage

EMAIL_SERVER = getenv('EMAIL_SERVER')
EMAIL_PORT = int(getenv('EMAIL_PORT'))
EMAIL_PWD = getenv('EMAIL_PWD')
EMAIL = getenv('EMAIL')


class EmailVerfifcation:
    def __init__(
        self,
        server: str,
        port: int,
        pwd: str,
        from_email: str
    ) -> None:

        self._server = server
        self._port = port
        self._pwd = pwd
        self._from_email = from_email

    async def create_enter_code(self):
        return ''.join([str(randint(0, 9)) for _ in range(6)])

    def send_verification_code(
        self,
        to_email: str,
        verfification_code: str
    ) -> None:

        with SMTP(
            self._server,
            self._port
        ) as server:

            msg = EmailMessage()
            msg['From'] = self._from_email
            msg['To'] = to_email
            msg['Subject'] = 'Подтверждения почты'

            html_content = self._generate_html_for_verfifcation_code(
                verfification_code)

            msg.set_content(
                f'Ваш код подтверждения: {verfification_code}',
                subtype='plain'
            )
            msg.add_alternative(html_content, subtype='html')
            server.starttls()
            server.login(self._from_email, self._pwd)
            server.send_message(msg)

    @staticmethod
    def _generate_html_for_verfifcation_code(
        verification_code: str
    ) -> str:
        return f'''
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Подтверждение почты</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
            background-color: #FAFAFA;
            color: #0A0A0A;
            line-height: 1.6;
            padding: 20px;
        }}
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }}
        .email-header {{
            background: #FFFFFF;
            padding: 32px 24px;
            text-align: center;
            border-bottom: 1px solid #E5E5E5;
        }}
        .email-header h1 {{
            color: #0A0A0A;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin: 0;
        }}
        .email-content {{
            padding: 32px 24px;
        }}
        .email-title {{
            font-size: 20px;
            font-weight: 600;
            color: #0A0A0A;
            margin-bottom: 16px;
            text-align: center;
        }}
        .email-text {{
            font-size: 14px;
            color: #525252;
            margin-bottom: 24px;
            text-align: center;
            line-height: 1.6;
        }}
        .code-container {{
            background: #F5F5F5;
            border: 1px solid #E5E5E5;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 32px 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }}
        .verification-code {{
            font-size: 32px;
            font-weight: 700;
            color: #0A0A0A;
            letter-spacing: 8px;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            margin: 0;
        }}
        .email-footer {{
            padding: 24px;
            text-align: center;
            border-top: 1px solid #F5F5F5;
            font-size: 12px;
            color: #737373;
        }}
        .email-footer p {{
            margin: 8px 0;
        }}
        .warning-text {{
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 6px;
            padding: 12px 16px;
            margin-top: 24px;
            font-size: 12px;
            color: #DC2626;
            text-align: center;
        }}
        @media only screen and (max-width: 600px) {{
            .email-container {{
                border-radius: 0;
            }}
            .email-header {{
                padding: 24px 16px;
            }}
            .email-content {{
                padding: 24px 16px;
            }}
            .verification-code {{
                font-size: 24px;
                letter-spacing: 4px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Подтверждение почты</h1>
        </div>
        <div class="email-content">
            <h2 class="email-title">Добро пожаловать!</h2>
            <p class="email-text">
                Спасибо за регистрацию! Для завершения регистрации и подтверждения вашей электронной почты, 
                пожалуйста, введите следующий код подтверждения:
            </p>
            <div class="code-container">
                <p class="verification-code">{verification_code}</p>
            </div>
            <p class="email-text">
                Этот код действителен в течение 10 минут. Если вы не запрашивали этот код, 
                просто проигнорируйте это письмо.
            </p>
            <div class="warning-text">
                ⚠️ Никому не сообщайте этот код. Мы никогда не попросим вас предоставить его по телефону или email.
            </div>
        </div>
        <div class="email-footer">
            <p>С уважением, команда MSTV2</p>
            <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
        </div>
    </div>
</body>
</html>
        '''


email_verfification_obj = EmailVerfifcation(
    EMAIL_SERVER,
    EMAIL_PORT,
    EMAIL_PWD,
    EMAIL
)
