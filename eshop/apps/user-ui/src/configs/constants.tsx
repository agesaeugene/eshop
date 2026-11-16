export const SELLER_UI_URL =
  process.env.NEXT_PUBLIC_SELLER_UI_URL ?? 'http://localhost:3001';

// Change to `/login` if you want existing sellers to sign in first.
export const SELLER_SIGNUP_URL = `${SELLER_UI_URL}/login`;

export type NavItemsTypes = {
  title: string;
  href: string;
  external?: boolean;
};

export const navItems: NavItemsTypes[] = [
  { title: 'Home', href: '/' },
  { title: 'Products', href: '/products' },
  { title: 'shops', href: '/shops' },
  { title: 'Offers', href: '/offers' },
  { title: 'Become A Seller', href: SELLER_SIGNUP_URL, external: true },
];