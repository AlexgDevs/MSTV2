import React from 'react';
import { Link } from 'react-router-dom';
import '../../assets/styles/Footer.css';

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3 className="footer-title">MSTV2</h3>
                        <p className="footer-description">
                            Платформа для записи на услуги
                        </p>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-section-title">Информация</h4>
                        <ul className="footer-links">
                            <li>
                                <Link to="/about" className="footer-link">О сайте</Link>
                            </li>
                            <li>
                                <Link to="/privacy" className="footer-link">Политика конфиденциальности</Link>
                            </li>
                            <li>
                                <Link to="/terms" className="footer-link">Пользовательское соглашение</Link>
                            </li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-section-title">Контакты</h4>
                        <ul className="footer-links">
                            <li>
                                <a href="mailto:support@mstv2.ru" className="footer-link">
                                    support@mstv2.ru
                                </a>
                            </li>
                            <li>
                                <span className="footer-text">+7 (XXX) XXX-XX-XX</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © {currentYear} MSTV2. Платформа для записи на услуги.
                    </p>
                </div>
            </div>
        </footer>
    );
};

