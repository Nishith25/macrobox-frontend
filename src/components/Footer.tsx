// frontend/src/components/Footer.tsx (FRONTEND)

import type { ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  ClipboardList,
  Gift,
  HeartPulse,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Utensils,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "918985892525";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      "Hi MacroBox, I need help with meals, plans or my order."
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

      <div className="relative mx-auto max-w-[1240px] px-4 pb-7 pt-10 sm:px-6 sm:pb-8 sm:pt-12 lg:px-8 lg:pt-16">
        <section className="mb-glass overflow-hidden rounded-[28px] p-5 sm:p-7 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-accent-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.17em]">
                <HeartPulse size={14} />
                Healthy meals made simple
              </div>

              <h2 className="mb-text mt-5 max-w-2xl text-3xl font-light leading-[1.05] tracking-[-0.055em] sm:text-4xl lg:text-5xl">
                Build your meals around your goals.
              </h2>

              <p className="mb-text-muted mt-4 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                Explore goal-based meals, complete meal plans, macro tracking
                and convenient delivery scheduling with MacroBox.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                to="/meals"
                className="mb-primary-button inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
              >
                <Utensils size={17} />
                Explore meals
                <ArrowUpRight size={16} />
              </Link>

              <button
                type="button"
                onClick={openWhatsApp}
                className="mb-accent-button inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-6 text-sm font-medium"
              >
                <MessageCircle size={17} />
                WhatsApp support
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr] lg:gap-12 lg:py-14">
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
              Goal-based healthy meals and plans with transparent calories,
              protein, carbs and fat information.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <FooterBadge icon={<ShieldCheck size={13} />}>
                Secure checkout
              </FooterBadge>

              <FooterBadge icon={<CalendarCheck size={13} />}>
                Scheduled delivery
              </FooterBadge>
            </div>

            <div className="mt-6 flex gap-2">
              <SocialButton
                href="https://instagram.com"
                label="Instagram"
                icon={<Instagram size={17} />}
              />

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

          <FooterColumn title="Explore">
            <FooterLink to="/meals" icon={<Utensils size={14} />}>
              Meals
            </FooterLink>

            <FooterLink to="/plans" icon={<ClipboardList size={14} />}>
              Meal Plans
            </FooterLink>

            <FooterLink to="/rewards" icon={<Gift size={14} />}>
              Plan Rewards
            </FooterLink>
          </FooterColumn>

          <FooterColumn title="Tools">
            <FooterLink to="/macrotrack" icon={<Zap size={14} />}>
              MacroTrack
            </FooterLink>

            <FooterLink
              to="/smart-day-planner"
              icon={<CalendarCheck size={14} />}
            >
              Smart Day Planner
            </FooterLink>

            <FooterLink to="/orders" icon={<ClipboardList size={14} />}>
              Orders
            </FooterLink>
          </FooterColumn>

          <FooterColumn title="Account">
            <FooterLink to="/my-account">My Account</FooterLink>

            <FooterLink to="/cart">Cart</FooterLink>

            <button
              type="button"
              onClick={openWhatsApp}
              className="mb-text-muted flex items-center gap-2 text-left text-sm transition hover:text-[var(--mb-text)]"
            >
              <MessageCircle size={14} />
              Help & Support
            </button>

            <div className="mb-text-faint mt-4 flex items-start gap-2 text-xs leading-5">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              Hyderabad, Telangana
            </div>
          </FooterColumn>
        </section>

        <section className="mb-divider flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
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
              Terms & Conditions
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
  icon,
}: {
  to: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="mb-text-muted flex items-center gap-2 text-sm transition hover:translate-x-1 hover:text-[var(--mb-text)]"
    >
      {icon}
      {children}
    </Link>
  );
}

function FooterBadge({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="mb-outline-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium">
      {icon}
      {children}
    </span>
  );
}

function SocialButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="mb-outline-button flex h-10 w-10 items-center justify-center rounded-full"
    >
      {icon}
    </a>
  );
}
