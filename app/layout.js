import Link from 'next/link';
import Clock from './components/Clock';
import SignOut from './components/SignOut';
import './globals.css';

export const metadata = {
  title: 'Journal',
  description: 'A personal journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
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
            <nav className="fn-keys">
              <Link href="/" className="fn-key"><span className="num">1)</span>Entries</Link>
              <Link href="/new/" className="fn-key"><span className="num">2)</span>New entry</Link>
              <SignOut />
            </nav>
            <Clock />
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
