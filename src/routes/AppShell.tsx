import { NavLink, Outlet } from 'react-router-dom';
import { t } from '@/i18n';
import { paths } from './routes';

/** Shared layout: content + bottom navigation (Home, Discovery, +, Chat, Profile). */
export function AppShell() {
  return (
    <div className="lg-shell">
      <main className="lg-shell__main">
        <Outlet />
      </main>
      <nav className="lg-nav" aria-label="Primary">
        <NavLink to={paths.home} end>
          {t('nav.home')}
        </NavLink>
        <NavLink to={paths.discovery}>{t('nav.discovery')}</NavLink>
        <NavLink to={paths.createGame} className="lg-nav__create" aria-label={t('nav.create')}>
          +
        </NavLink>
        <NavLink to={paths.chat}>{t('nav.chat')}</NavLink>
        <NavLink to={paths.myProfile}>{t('nav.profile')}</NavLink>
      </nav>
    </div>
  );
}
