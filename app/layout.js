import Link from 'next/link';
import Clock from './components/Clock';
import CommandBar from './components/CommandBar';
import CommandKey from './components/CommandKey';
import RandomKey from './components/RandomKey';
import Shortcuts from './components/Shortcuts';
import ThemeControls from './components/ThemeControls';
import TypingSound from './components/TypingSound';
import { THEME_BOOT } from '../lib/theme';
import './globals.css';

export const metadata = {
  title: 'Journal',
  description: 'A personal journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="header-left">
              <Link href="/" className="logo-link" aria-label="Entries">
                <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`} alt="" className="logo" />
              </Link>
              <nav className="fn-keys">
                <Link href="/" className="fn-key"><span className="num">1)</span>Entries</Link>
                <Link href="/new/" className="fn-key"><span className="num">2)</span>New entry</Link>
                <Link href="/tags/" className="fn-key"><span className="num">3)</span>Tags</Link>
                <RandomKey />
                <Link href="/stats/" className="fn-key"><span className="num">5)</span>Stats</Link>
                <Link href="/habits/" className="fn-key"><span className="num">6)</span>Habits</Link>
              </nav>
            </div>
            <div className="header-right">
              <CommandKey />
              <ThemeControls />
              <Clock />
            </div>
          </div>
        </header>
        <main className="container">{children}</main>
        <Shortcuts />
        <CommandBar />
        <TypingSound />
      </body>
    </html>
  );
}
