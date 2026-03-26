import Header from '../shared/widgets/header/header';
import './global.css';
import {Poppins, Roboto} from "next/font/google";

export const metadata = {
  title: 'SokoJamo',
  description: 'SokoJamo is a cutting-edge e-commerce platform designed to provide seamless shopping experiences. It is your go-to destination for all your e-commerce needs.',
};

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-roboto',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700'],
  variable: '--font-poppins',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${poppins.variable} font-sans bg-gray-50`}>
        <Header />
        {children}
      </body>
    </html>
  )
}
