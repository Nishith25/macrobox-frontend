// frontend/src/components/Footer.tsx (FRONTEND)

import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Instagram,
  Mail,
  MessageCircle,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "918985892525";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      "Hi MacroBox, I need help with meals or plans."
    );

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="relative overflow-hidden border-t border-[var(--mb-divider)] bg-[var(--mb-bg)] text-[var(--mb-text)]">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[var(--mb-glow-primary)] blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[var(--mb-glow-accent)] blur-[110px]" />

      <div className="relative mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr] lg:gap-12">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3"
              aria-label="MacroBox home"
            >
              <span className="mb-primary-button flex h-11 w-11 items-center justify-center rounded-full">
                <Utensils size={19} />
              </span>

              <span className="mb-text text-2xl font-semibold tracking-[-0.055em]">
                MacroBox
              </span>
            </Link>

            <p className="mb-text-muted mt-4 max-w-sm text-sm leading-6">
              Healthy meals and plans with clear macro details.
            </p>

            <div className="mt-6 flex gap-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="mb-outline-button flex h-10 w-10 items-center justify-center rounded-full"
              >
                <Instagram size={17} />
              </a>

              <button
                type="button"
                onClick={openWhatsApp}
                aria-label="WhatsApp support"
                className="mb-outline-button flex h-10 w-10 items-center justify-center rounded-full"
              >
                <MessageCircle size={17} />
              </button>

              <a
                href="mailto:support@macrobox.co.in"
                aria-label="Email MacroBox"
                className="mb-outline-button flex h-10 w-10 items-center justify-center rounded-full"
              >
                <Mail size={17} />
              </a>
            </div>
          </div>

          <FooterColumn title="Order">
            <FooterLink to="/meals">Meals</FooterLink>
            <FooterLink to="/plans">Plans</FooterLink>
            <FooterLink to="/cart">Cart</FooterLink>
          </FooterColumn>

          <FooterColumn title="Support">
            <button
              type="button"
              onClick={openWhatsApp}
              className="mb-text-muted text-left text-sm transition hover:text-[var(--mb-text)]"
            >
              WhatsApp support
            </button>

            <FooterLink to="/my-account">My Account</FooterLink>
            <FooterLink to="/orders">Orders</FooterLink>
          </FooterColumn>
        </section>

        <section className="mb-divider mt-9 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="mb-text-faint text-xs">
            © {currentYear} MacroBox. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              className="mb-text-faint text-xs transition hover:text-[var(--mb-text)]"
            >
              Privacy Policy
            </button>

            <button
              type="button"
              className="mb-text-faint text-xs transition hover:text-[var(--mb-text)]"
            >
              Terms
            </button>

            <button
              type="button"
              onClick={scrollToTop}
              className="mb-outline-button inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium"
            >
              Back to top
              <ArrowUpRight size={13} />
            </button>
          </div>
        </section>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-text-faint text-[10px] font-semibold uppercase tracking-[0.17em]">
        {title}
      </p>

      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="mb-text-muted text-sm transition hover:translate-x-1 hover:text-[var(--mb-text)]"
    >
      {children}
    </Link>
  );
}
