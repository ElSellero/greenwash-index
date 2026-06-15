import type { Metadata } from 'next';
import { Fira_Sans, Fira_Code } from 'next/font/google';
import { ConsentLoader } from '@/components/ui/ConsentLoader';
import { DonationBanner } from '@/components/ui/DonationBanner';
import { SiteFooter } from '@/components/ui/SiteFooter';
import './globals.css';

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fira-sans',
});
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });

export const metadata: Metadata = {
  title: 'Greenwash Index — who preaches water and flies kerosene',
  description:
    'Satirical data visualization ranking public figures by the gap between their climate advocacy and their documented private-jet and yacht emissions.',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={`${firaSans.variable} ${firaCode.variable}`}>
    <body className="antialiased">
      <ConsentLoader />
      <DonationBanner />
      {children}
      <SiteFooter />
    </body>
  </html>
);

export default RootLayout;
