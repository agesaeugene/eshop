export const navItems:NavItemsTypes[] = [
  {
    title: 'Home',
    href: '/'
  },
  {
    title: 'Products',
    href: '/products'
  },
  {
    title: 'shops',
    href: '/shops'
  },
  {
    title: 'Become A Seller',
    href: '/become-a-seller'
  }
]

export type NavItemsTypes = {
  title: string,
  href: string
}