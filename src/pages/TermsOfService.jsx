import { Link } from 'react-router-dom'
import Wordmark from '@/components/Wordmark'
import { APP_NAME, BUILDER } from '@/lib/appBranding'

const EFFECTIVE_DATE = 'April 19, 2026'
const CONTACT_EMAIL = 'jdixon@aidantaylor.com'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="block"><Wordmark size="md" /></Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 text-foreground">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective {EFFECTIVE_DATE}</p>

        <Section title="About these terms">
          <p>
            These Terms govern your use of {APP_NAME}, a chapter-operations platform
            built by {BUILDER.company} for members of Entrepreneurs' Organization
            (EO) chapters. By signing in, you agree to these Terms and to the{' '}
            <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            Access is limited to invited members of participating EO chapters and to
            Strategic Alliance Partners (SAPs) explicitly granted portal access by a
            chapter. You may not use the platform if your invitation has been revoked
            or your chapter membership has ended.
          </p>
        </Section>

        <Section title="Beta status">
          <p>
            {APP_NAME} is in active beta. This means:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
            <li>Features may change, be removed, or behave unexpectedly.</li>
            <li>The platform is provided without service-level guarantees, warranties of fitness for a particular purpose, or uptime commitments.</li>
            <li>You should not store information in the platform that you cannot afford to lose, and you should keep your own records of anything mission-critical.</li>
            <li>Each material update is gated behind an in-app Beta Terms acknowledgment, which you must accept before continuing.</li>
          </ul>
        </Section>

        <Section title="How sign-in works">
          <p>
            {APP_NAME} uses passwordless authentication. You can sign in by:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
            <li><strong>Email magic link:</strong> we send a one-time link to your registered email; clicking it signs you in.</li>
            <li><strong>SMS one-time passcode:</strong> we send a 6-digit code to your registered phone number; entering it signs you in.</li>
          </ul>
          <p className="mt-3">
            You are responsible for the security of the email inbox and phone number
            you use to sign in. Do not share sign-in links or codes; anyone who has
            them can sign in as you.
          </p>
        </Section>

        <Section title="SMS terms">
          <p>
            If you choose phone-based sign-in, you agree to receive transactional
            SMS messages containing one-time passcodes. We do not send marketing or
            promotional SMS. Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help.
            Message and data rates may apply.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
            <li>Share another member's private content (reflections, lifeline entries, forum discussions) outside the intended audience.</li>
            <li>Use the platform to harass, defame, or harm other members.</li>
            <li>Impersonate another member or misrepresent your role.</li>
            <li>Attempt to access data beyond what your role permits, or to circumvent technical access controls.</li>
            <li>Reverse-engineer, scrape, or extract bulk data without explicit permission from {BUILDER.company}.</li>
            <li>Upload content that infringes third-party intellectual property or violates applicable law.</li>
          </ul>
        </Section>

        <Section title="Your content">
          <p>
            You retain ownership of the content you submit (survey responses,
            reflections, forum posts, etc.). You grant {BUILDER.company} a limited
            license to host, store, display, and process this content solely to
            operate the platform on behalf of your chapter. We do not use your
            content for marketing, training third-party AI models, or any purpose
            outside running the platform.
          </p>
        </Section>

        <Section title="Confidentiality of forum content">
          <p>
            Forum discussions within EO are foundationally confidential. By posting
            in a forum, you agree to keep other members' contributions confidential
            and to share your own only as you choose. The platform's technical
            controls support this norm but do not replace it.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            The platform is provided <strong>"as is"</strong> and <strong>"as available"</strong> during the beta period. {BUILDER.company} disclaims all warranties to the extent permitted by law, including warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the fullest extent permitted by law, {BUILDER.company} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or use, arising out of or related to your use of the platform — even if advised of the possibility of such damages.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            Your access may be terminated at any time, with or without notice, if your chapter membership ends, your invitation is revoked, or you violate these Terms. You may stop using the platform at any time by signing out and requesting account deletion (see the Privacy Policy).
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these Terms from time to time. Material changes will be
            communicated through the in-app Beta Terms acknowledgment flow, which
            requires you to review and accept updates before continuing.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These Terms are governed by the laws of the State of Arizona, USA,
            without regard to conflict-of-law principles. Disputes will be resolved
            in the state or federal courts located in Maricopa County, Arizona.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <p>
            {APP_NAME} · Built by{' '}
            {BUILDER.url ? (
              <a
                href={BUILDER.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {BUILDER.company}
              </a>
            ) : (
              BUILDER.company
            )}
          </p>
        </footer>
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  )
}
