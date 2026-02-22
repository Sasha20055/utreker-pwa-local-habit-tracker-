import React from 'react';
import FAQSection from './FAQSection';

// Initialize theme before first render to avoid flash
if (typeof window !== 'undefined') {
  try {
    const saved = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initial);
  } catch (e) {
    /* ignore */
  }
}

const HeroSection = () => {
  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">Habitly</a>
        <ul className="navbar-links">
          <li><a href="#features">Функции</a></li>
          <li><a href="#faq">Вопросы</a></li>
          <li><a href="#about">О проекте</a></li>
        </ul>
        <button
          className="theme-toggle"
          aria-label="Переключить тему"
          onClick={() => {
            const root = document.documentElement;
            const current = root.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try { window.localStorage.setItem('theme', next); } catch (e) {}
          }}
        >
          {/* Moon icon — shown in light mode */}
          <svg className="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          {/* Sun icon — shown in dark mode */}
          <svg className="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">Начните вырабатывать полезные привычки уже сегодня</span>
          <h1>
            Преобразите свою жизнь,<br />
            <span>По одной привычке за раз</span>
          </h1>
          <p>
            Следите за ежедневными целями, формируйте устойчивые привычки и становитесь
            лучшей версией себя. Просто, красиво и создано, чтобы поддерживать мотивацию.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary">
              Начать бесплатно
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn btn-secondary">
              Подробнее
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="features-container">
          <div className="features-header">
            <h2>Всё, что нужно, чтобы добиться успеха</h2>
            <p>Функции, которые помогут выстраивать и поддерживать полезные привычки без усилий.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3>Ежедневное отслеживание</h3>
              <p>Отмечайте выполнение привычек одним нажатием. Визуальный прогресс поддерживает мотивацию ежедневно.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <h3>Аналитика прогресса</h3>
              <p>Наглядные графики и инсайты показывают прогресс за недели, месяцы и годы.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <h3>Умные напоминания</h3>
              <p>Персональные уведомления в подходящее время, чтобы поддерживать привычку, не раздражая.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <h3>Награды за серии</h3>
              <p>Развивайте инерцию с помощью отслеживания серий и отмечайте важные достижения.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h3>Гибкое планирование</h3>
              <p>Назначайте привычки на определённые дни или собственные интервалы. Ваш график — ваши правила.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <h3>Дневник настроения</h3>
              <p>Отслеживайте, как привычки влияют на самочувствие, и находите закономерности в образе жизни.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CTA */}
      <section className="cta">
        <div className="cta-container">
          <h2>Готовы выстраивать полезные привычки?</h2>
          <p>Присоединяйтесь к тысячам людей, которые изменили свою жизнь с Habitly. Начните своё путешествие уже сегодня.</p>
          <button className="btn btn-primary">
            Начать бесплатно
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>2024 Habitly. Создано, чтобы помочь вам достигать целей.</p>
      </footer>
    </>
  );
};

export default HeroSection;
