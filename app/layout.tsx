import './globals.css';
import React from 'react';

export const metadata = { title: 'annetmii English Dictionary', description: 'Learning app' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
