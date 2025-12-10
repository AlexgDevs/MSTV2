import React from 'react';
import { Link } from 'react-router-dom';
import '../../assets/styles/LegalPage.css';

export const AboutPage: React.FC = () => {
    return (
        <div className="legal-page">
            <div className="legal-container">
                <div className="legal-header">
                    <h1>О сайте</h1>
                </div>

                <div className="legal-content">
                    <section>
                        <h2>Информация о владельце сайта</h2>
                        <p>
                            <strong>Наименование:</strong> MSTV2<br />
                            <strong>Тип:</strong> Платформа для записи на услуги<br />
                            <strong>Контактный email:</strong> support@mstv2.ru<br />
                            <strong>Контактный телефон:</strong> +7 (XXX) XXX-XX-XX
                        </p>
                    </section>

                    <section>
                        <h2>Описание сервиса</h2>
                        <p>
                            MSTV2 — это платформа, которая позволяет мастерам создавать свои услуги, 
                            управлять расписанием и принимать записи от клиентов. Клиенты могут просматривать 
                            доступные услуги, выбирать удобное время и записываться на услуги.
                        </p>
                    </section>

                    <section>
                        <h2>Основные функции</h2>
                        <ul>
                            <li>Создание и управление услугами</li>
                            <li>Управление расписанием и доступными датами</li>
                            <li>Запись клиентов на услуги</li>
                            <li>Управление записями и их статусами</li>
                            <li>Система шаблонов расписания</li>
                        </ul>
                    </section>

                    <section>
                        <h2>Техническая информация</h2>
                        <p>
                            Сайт разработан с использованием современных технологий веб-разработки 
                            и соответствует требованиям безопасности обработки персональных данных.
                        </p>
                    </section>

                    <section>
                        <h2>Связь с нами</h2>
                        <p>
                            Если у вас есть вопросы или предложения, вы можете связаться с нами:
                        </p>
                        <ul>
                            <li>Через форму обратной связи на сайте</li>
                            <li>По электронной почте: support@mstv2.ru</li>
                            <li>По телефону: +7 (XXX) XXX-XX-XX</li>
                        </ul>
                    </section>
                </div>

                <div className="legal-footer">
                    <Link to="/" className="legal-link">Вернуться на главную</Link>
                </div>
            </div>
        </div>
    );
};

