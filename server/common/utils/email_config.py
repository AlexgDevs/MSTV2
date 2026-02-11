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

    def send_refound_payment_message(
            self,
            to_email: str,
            msg: str):

        with SMTP(self._server, self._port) as server:
            email_msg = EmailMessage()
            email_msg['From'] = self._from_email
            email_msg['To'] = to_email
            email_msg['Subject'] = 'Возврат платежа'
            email_msg.set_content(msg, subtype='plain')
            server.starttls()
            server.login(self._from_email, self._pwd)
            server.send_message(email_msg)

    def send_cancel_enroll_message(
        self,
        to_email: str,
        service_title: str,
        master_name: str,
        reason: str
    ):
        html_content = self._generate_html_for_cancel_enroll(
            service_title, master_name, reason
        )

        with SMTP(self._server, self._port) as server:
            msg = EmailMessage()
            msg['From'] = self._from_email
            msg['To'] = to_email
            msg['Subject'] = 'Отмена записи на услугу'

            plain_text = f'''Ваша запись на услугу "{service_title}" была отменена мастером {master_name}.

Причина отмены: {reason}

Если у вас возникли вопросы, пожалуйста, свяжитесь с мастером.

С уважением,
команда MSTV2'''

            msg.set_content(plain_text, subtype='plain')
            msg.add_alternative(html_content, subtype='html')
            server.starttls()
            server.login(self._from_email, self._pwd)
            server.send_message(msg)

    async def send_tg_verification_code(
        self,
        to_email: str,
        verification_code: str):

        with SMTP(
            self._server,
            self._port
        ) as server:

            msg = EmailMessage()
            msg['From'] = self._from_email
            msg['To'] = to_email
            msg['Subject'] = 'Привязка телеграмм аккаунта'

            html_content = self._generate_html_for_verfifcation_code(
                verification_code)

            msg.set_content(
                f'Ваш код для привязки аккаунта: {verification_code}',
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
            <h1>Привязка телеграмм аккаунта к сайту</h1>
        </div>
        <div class="email-content">
            <h2 class="email-title">Добро пожаловать!</h2>
            <p class="email-text">
                Спасибо за привязку! Для ее завершения, 
                пожалуйста, введите следующий код подтверждения телеграмм боту без пробелов:
            </p>
            <div class="code-container">
                <p class="verification-code">{verification_code}</p>
            </div>
            <p class="email-text">
                Этот код действителен в течение 10 минут. Если вы не запрашивали этот код, 
                просто проигнорируйте это письмо.
            </p>
            <div class="warning-text">
                Никому не сообщайте этот код. Мы никогда не попросим вас предоставить его по телефону или email.
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

    @staticmethod
    def _generate_html_for_cancel_enroll(
        service_title: str,
        master_name: str,
        reason: str
    ) -> str:
        return f'''
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отмена записи</title>
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
            background: #FEF2F2;
            padding: 32px 24px;
            text-align: center;
            border-bottom: 1px solid #FECACA;
        }}
        .email-header h1 {{
            color: #DC2626;
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
        }}
        .email-text {{
            font-size: 14px;
            color: #525252;
            margin-bottom: 16px;
            line-height: 1.6;
        }}
        .info-box {{
            background: #FAFAFA;
            border: 1px solid #E5E5E5;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
        }}
        .info-box-item {{
            margin-bottom: 12px;
        }}
        .info-box-item:last-child {{
            margin-bottom: 0;
        }}
        .info-box-label {{
            font-size: 12px;
            font-weight: 600;
            color: #737373;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }}
        .info-box-value {{
            font-size: 14px;
            color: #0A0A0A;
            font-weight: 500;
        }}
        .reason-box {{
            background: #FEF2F2;
            border-left: 4px solid #DC2626;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
        }}
        .reason-label {{
            font-size: 12px;
            font-weight: 600;
            color: #DC2626;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
        }}
        .reason-text {{
            font-size: 14px;
            color: #0A0A0A;
            line-height: 1.6;
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
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Запись отменена</h1>
        </div>
        <div class="email-content">
            <h2 class="email-title">Уважаемый клиент!</h2>
            <p class="email-text">
                К сожалению, ваша запись на услугу была отменена мастером.
            </p>
            
            <div class="info-box">
                <div class="info-box-item">
                    <div class="info-box-label">Услуга</div>
                    <div class="info-box-value">{service_title}</div>
                </div>
                <div class="info-box-item">
                    <div class="info-box-label">Мастер</div>
                    <div class="info-box-value">{master_name}</div>
                </div>
            </div>
            
            <div class="reason-box">
                <div class="reason-label">Причина отмены</div>
                <div class="reason-text">{reason}</div>
            </div>
            
            <p class="email-text">
                Если у вас возникли вопросы, пожалуйста, свяжитесь с мастером напрямую.
            </p>
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

#demo hold mvp confirm