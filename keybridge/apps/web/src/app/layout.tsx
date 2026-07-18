import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KeyBridge — Connect your AI key',
  description:
    'Safely connect an AI provider API key to your tools, without confusion and without ever exposing it in plaintext.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
