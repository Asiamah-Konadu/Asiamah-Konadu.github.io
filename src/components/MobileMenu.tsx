"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface MobileMenuProps {
  links: { label: string; href: string }[];
}

export default function MobileMenu({ links }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">{isOpen ? "×" : "☰"}</span>
        <span>Menu</span>
      </button>
      {isOpen && createPortal(
        <div className="mobile-menu-layer">
          <button
            className="mobile-menu-backdrop"
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
          />
          <aside className="mobile-menu-panel" id="mobile-navigation">
            <div className="mobile-menu-heading">
              <span>Explore Maxwellina Foods</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <nav aria-label="Mobile navigation">
              {links.map(({ href, label }) => (
                <Link href={href} key={href} onClick={() => setIsOpen(false)}>
                  {label}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
