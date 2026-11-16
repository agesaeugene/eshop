import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadCrumbItem {
    label: string;
    href?: string;
}

interface BreadCrumbsProps {
    /** Current page label (last crumb). */
    title?: string;
    /** Optional intermediate crumbs between Dashboard and the current page. */
    items?: BreadCrumbItem[];
    className?: string;
}

const BreadCrumbs = ({ title, items = [], className = "" }: BreadCrumbsProps) => {
    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex flex-wrap items-center gap-1 text-sm mb-4 ${className}`}
        >
            {/* Root crumb */}
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 transition">
                Dashboard
            </Link>

            {/* Intermediate crumbs */}
            {items.map((item, index) => (
                <React.Fragment key={`${item.label}-${index}`}>
                    <ChevronRight size={16} className="text-gray-400" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="text-blue-400 hover:text-blue-300 transition"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-300">{item.label}</span>
                    )}
                </React.Fragment>
            ))}

            {/* Current page (from the title prop) */}
            {title && (
                <>
                    <ChevronRight size={16} className="text-gray-400" />
                    <span className="text-white font-medium" aria-current="page">
                        {title}
                    </span>
                </>
            )}
        </nav>
    );
};

export default BreadCrumbs;