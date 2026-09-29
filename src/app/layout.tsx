import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Abbey | Tembusu College Bandroom Portal',
  description: 'Automated bandroom booking, door opening duty coordination, and equipment loans for Tembusu College Arts Committee.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0d1117] text-[#f0f6fc] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
