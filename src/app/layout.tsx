import type { Metadata } from 'next';
import { MotionProvider } from '@/components/motion-provider';
import './globals.css';
export const metadata: Metadata = {
  title: 'BoundPay — Procurement inside your rules',
  description:
    'Turn purchasing requests into policy-checked, explainable PayPal Sandbox transactions. The AI recommends. Policy enforces. You approve.',
  applicationName: 'BoundPay',
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
