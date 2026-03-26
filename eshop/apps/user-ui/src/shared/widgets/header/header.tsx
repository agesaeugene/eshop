"use client";

import ProfileIcon from '../../../assets/svgs/profile-icon';
import HeartIcon from '../../../assets/svgs/heart-icon';
import CartIcon from '../../../assets/svgs/cart-icon';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import HeaderBottom from './header-bottom';

const Header = () => {
  const [searchValue, setSearchValue] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  /* Lock body scroll when mobile drawer is open */
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/*
        The top bar is NOT sticky — it scrolls away naturally.
        HeaderBottom takes over as a fixed bar once the top bar leaves the viewport.
      */}
      <header className="w-full bg-white shadow-sm">

        {/* ── Top bar ──────────────────────────────────────── */}
        <div className="w-[92%] max-w-7xl py-3 mx-auto flex items-center gap-3">

          {/* Hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/" aria-label="SokoJamo home" className="shrink-0">
            <span className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 hover:text-blue-700 transition-colors duration-200">
              SokoJamo
            </span>
          </Link>

          <div className="flex-1" />

          {/* Desktop search */}
          <div className="hidden sm:block">
            <div
              className="flex items-center px-3 py-2 rounded-lg border border-white gap-2"
              style={{ background: 'linear-gradient(40deg, #111, #1a56db)', color: '#fff' }}
            >
              <style>{`
                .search-wrapper .search-input { width: 0; transition: width 0.4s ease; background: transparent; border: none; outline: none; color: #fff; font-family: inherit; padding: 0; }
                .search-input::placeholder { color: #ccd9f5; }
                .search-wrapper:hover .search-input, .search-wrapper:focus-within .search-input { width: 180px; padding: 0 8px; }
              `}</style>
              <div className="search-wrapper flex items-center gap-2">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search products..."
                  className="search-input text-sm"
                />
                <button type="button" className="flex items-center justify-center w-6 h-6 bg-transparent border-none cursor-pointer text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile search icon */}
          <button
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            aria-label="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>

          {/* Wishlist */}
          <Link href="/wishlist" className="relative hidden sm:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 group">
            <HeartIcon className="w-5 h-5 text-gray-600 group-hover:text-red-500 transition-colors duration-200" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">0</span>
          </Link>

          {/* Cart */}
          <Link href="/cart" className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 group">
            <CartIcon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">0</span>
          </Link>

          {/* Sell (desktop only) */}
          <Link href="/sell" className="hidden md:inline-block text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap">
            Sell on SokoJamo
          </Link>

          {/* Profile */}
          <Link href="/login" className="flex items-center gap-2 group" aria-label="Sign in">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 group-hover:bg-blue-50 group-hover:text-blue-700 text-gray-600 transition-all duration-200">
              <ProfileIcon className="w-5 h-5" />
            </div>
            <div className="leading-tight hidden md:block">
              <span className="block text-xs text-gray-500 group-hover:text-blue-600 transition-colors">Hello,</span>
              <span className="block text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Sign In</span>
            </div>
          </Link>
        </div>

        {/* ── Mobile inline search bar ─────────────────────── */}
        {isMobileSearchOpen && (
          <div className="sm:hidden px-4 pb-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search products, brands..."
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
              {searchValue && (
                <button onClick={() => setSearchValue('')} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom nav row — delegated to HeaderBottom ── */}
        <HeaderBottom />

        <div className="border-b border-slate-200" />
      </header>

      {/* ── Mobile drawer backdrop ───────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer (slides in from left) ─────────── */}
      <div
        className={`fixed top-0 left-0 h-full w-[80%] max-w-xs bg-white z-50 md:hidden shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-xl font-semibold text-gray-900">SokoJamo</span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Sign-in strip */}
        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 bg-blue-50 hover:bg-blue-100 transition-colors">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white">
            <ProfileIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800">Sign In</p>
            <p className="text-xs text-blue-600">Access your account</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-auto text-blue-400">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </Link>

        {/* Scrollable nav content */}
        <div className="flex-1 overflow-y-auto pb-6">
          {/* Quick links */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Menu</p>
            {([["Today's Deals", "/deals", "🏷️"], ["Best Sellers", "/bestsellers", "⭐"], ["Customer Service", "/customer-service", "💬"], ["Gift Cards", "/gift-cards", "🎁"], ["Sell on SokoJamo", "/sell", "🛍️"], ["Wishlist", "/wishlist", "♡"]] as [string, string, string][]).map(([label, href, icon]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 py-3 text-sm font-medium text-gray-800 hover:text-blue-600 border-b border-gray-50 last:border-0 transition-colors"
              >
                <span className="text-base w-5 text-center" aria-hidden>{icon}</span>
                {label}
              </Link>
            ))}
          </div>

          {/* Categories */}
          <div className="px-5 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Categories</p>
            <div className="grid grid-cols-2 gap-2">
              {(['Electronics', 'Fashion & Apparel', 'Home & Garden', 'Sports & Outdoors', 'Health & Beauty', 'Toys & Games', 'Automotive', 'Books & Media']).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-150 text-center"
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;