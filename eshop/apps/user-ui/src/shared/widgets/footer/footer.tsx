"use client";

import Link from "next/link";
import React from "react";

const accountLinks = [
  { label: "Track Orders", href: "/orders" },
  { label: "Shipping", href: "/shipping" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "My Account", href: "/profile" },
  { label: "Order History", href: "/orders/history" },
  { label: "Returns", href: "/returns" },
];

const infoLinks = [
  { label: "Our Story", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Latest News", href: "/news" },
  { label: "Contact Us", href: "/contact" },
];

const socials = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.87.24-1.46 1.49-1.46H16.5V4.36C16.19 4.32 15.13 4.23 13.9 4.23c-2.55 0-4.3 1.56-4.3 4.42v2.85H7v3h2.6V21h3.9z" />
      </svg>
    ),
  },
  {
    label: "Twitter",
    href: "https://twitter.com",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 5.9c-.7.32-1.5.53-2.3.63.83-.5 1.46-1.28 1.76-2.22-.78.46-1.63.8-2.55.98A4.02 4.02 0 0 0 15.5 4c-2.23 0-4.04 1.8-4.04 4.03 0 .32.03.62.1.92-3.36-.17-6.33-1.78-8.32-4.22-.35.6-.55 1.29-.55 2.03 0 1.4.71 2.63 1.8 3.36-.66-.02-1.29-.2-1.83-.5v.05c0 1.96 1.39 3.6 3.24 3.97-.34.1-.7.14-1.06.14-.26 0-.51-.03-.76-.07.52 1.6 2 2.77 3.77 2.8A8.08 8.08 0 0 1 2 18.57 11.4 11.4 0 0 0 8.29 20.4c7.55 0 11.68-6.26 11.68-11.69 0-.18 0-.36-.01-.53A8.3 8.3 0 0 0 22 5.9z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.94 5a2 2 0 1 1-4-.02 2 2 0 0 1 4 .02zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-3.96 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48z" />
      </svg>
    ),
  },
];

const Footer = () => {
  return (
    <footer className="w-full bg-[#f1f3f4] border-t border-slate-200">
      <div className="w-[90%] lg:w-[80%] mx-auto py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand + socials */}
          <div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-[220px]">
              Perfect ecommerce platform to start your business from scratch
            </p>
            <div className="flex items-center gap-3 mt-5">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-gray-600 shadow-sm hover:bg-blue-600 hover:text-white transition-colors duration-200"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* My Account */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              My Account
            </h4>
            <ul className="space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Information
            </h4>
            <ul className="space-y-2.5">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Talk To Us */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Talk To Us
            </h4>
            <p className="text-sm text-gray-600 mb-1">Got Questions? Call us</p>
            <a
              href="tel:+670413090762"
              className="block text-base font-bold text-gray-900 hover:text-blue-600 transition-colors mb-4"
            >
              +254 119 261 085
            </a>

            <div className="flex items-start gap-2.5 mb-2.5">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="text-gray-500 mt-0.5 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
                />
              </svg>
              <a
                href="mailto:support@eshop.com"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                support@eshop.com
              </a>
            </div>

            <div className="flex items-start gap-2.5">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="text-gray-500 mt-0.5 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"
                />
                <circle cx="12" cy="9" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-gray-600">
                79 Sleepy Hollow St.
                <br />
                Jamaica, New York 1432
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-200">
        <div className="w-[90%] lg:w-[80%] mx-auto py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} All Rights Reserved | Becodemy Private Ltd
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;