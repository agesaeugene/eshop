"use client";

import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';

const departments = [
  'Electronics',
  'Fashion & Apparel',
  'Home & Garden',
  'Sports & Outdoors',
  'Health & Beauty',
  'Toys & Games',
  'Automotive',
  'Books & Media',
];

const navLinks: [string, string][] = [
  ["Home", "/"],
  ["Products", "/products"],
  ["Shops", "/shops"],
  ["Offers", "/offers"],
];

const HeaderBottom = () => {
  const [showDepts, setShowDepts] = useState(false);
  const [activeLink, setActiveLink] = useState('/');
  const [isSticky, setIsSticky] = useState(false);
  const deptsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      // The top bar is ~64px tall — once it's scrolled past, fix the nav bar
      setIsSticky(window.scrollY > 64);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (deptsRef.current && !deptsRef.current.contains(e.target as Node)) {
        setShowDepts(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/*
        Spacer: when the bar goes fixed it leaves a gap.
        We reserve its height (44px) so the content below doesn't jump.
      */}
      {isSticky && <div className="h-[44px] hidden md:block" />}

      <div
        className={`w-full bg-white z-40 transition-shadow duration-200 hidden md:block ${
          isSticky ? 'fixed top-0 left-0 right-0 shadow-md' : 'relative'
        }`}
      >
        <div className="flex items-center border-t border-slate-100">

          {/* All Departments dropdown */}
          <div className="relative" ref={deptsRef}>
            <button
              onClick={() => setShowDepts((v) => !v)}
              className="flex items-center gap-2.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors duration-150"
              aria-expanded={showDepts}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              All Departments
              <svg
                width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                className={`ml-1 transition-transform duration-200 ${showDepts ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showDepts && (
              <div className="absolute top-full left-0 w-56 bg-white border border-gray-200 rounded-b-xl shadow-xl z-50 overflow-hidden">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setShowDepts(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-50 last:border-0 transition-colors text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1 ml-2">
            {navLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setActiveLink(href)}
                className={`px-4 py-3 text-sm font-medium transition-colors duration-150 border-b-2 ${
                  activeLink === href
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-700 border-transparent hover:text-blue-600'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Become a Seller */}
          <Link
            href="/sell"
            className="ml-auto mr-4 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors py-3"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
            Become A Seller
          </Link>
        </div>
      </div>
    </>
  );
};

export default HeaderBottom;