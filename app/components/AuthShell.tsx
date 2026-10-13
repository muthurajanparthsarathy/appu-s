import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Check, Leaf } from 'lucide-react';
import { Noto_Serif, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

// Fonts for the sign-in and create-account pages only; the rest of the store keeps its system font stack.
const serif = Noto_Serif({ subsets: ['latin'], display: 'swap', variable: '--auth-serif' });
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', variable: '--auth-sans' });

// Statements here must stay true of the store: they are shown to people deciding whether to register.
const PERKS = ['Buy 1 Get 1 free on Appu Appalam 150 g & 200 g', 'Free delivery on orders above ₹499', 'Cash on delivery across Coimbatore'];

/** Split card shared by Sign in and Create account: green brand panel plus the form, with no store header or footer. */
export function AuthShell({ variant, children }: { variant: 'login' | 'register'; children: ReactNode }) {
  const register = variant === 'register';
  return <main className={`auth-stage ${sans.variable} ${serif.variable}`}>
    <div className={`auth-frame ${variant}`}>
      <Link className="auth-back" href="/"><ArrowLeft size={16} aria-hidden="true"/> Back to Appu’s Mart</Link>
      <div className="auth-card">
        <section className="auth-panel">{children}</section>
        <aside className="auth-visual" aria-label="About Appu’s Mart">
          {!register && <span className="auth-line" aria-hidden="true"/>}
          <span className="auth-badge"><BadgeCheck size={18} aria-hidden="true"/> Authentic South Indian staples</span>
          <div className="auth-pitch">
            {register && <span className="auth-rule" aria-hidden="true"/>}
            <p className="auth-headline">Where Sacred Tradition Meets Culinary Reverence.</p>
            <p className="auth-subhead">Appu rice, PR and Daivam oils, ghee, butter and appalam, delivered across Coimbatore.</p>
            {register && <ul className="auth-perks">{PERKS.map(perk => <li key={perk}><span className="tick" aria-hidden="true"><Check size={16}/></span>{perk}</li>)}</ul>}
          </div>
          <div className="auth-visual-foot">
            {register
              ? <><span>Rice • Oils • Ghee • Appalam</span><BadgeCheck size={22} aria-hidden="true"/></>
              : <><Leaf size={18} aria-hidden="true"/><span>Trusted brands • Delivered across Coimbatore</span></>}
          </div>
        </aside>
      </div>
    </div>
  </main>;
}
