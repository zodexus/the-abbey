import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'abbey bookings 26/27', description: 'The Tembusu College bandroom. Check availability and request a session through Telegram.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
