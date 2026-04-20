import { Link } from 'react-router-dom'
import Wordmark from '@/components/Wordmark'
import { APP_NAME, BUILDER } from '@/lib/appBranding'

const EFFECTIVE_DATE = 'April 19, 2026'
const CONTACT_EMAIL = 'jdixon@aidantaylor.com'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="block"><Wordmark size="md" /></Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2">
            Terms of Service
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 text-foreground">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective {EFFECTIVE_DATE}</p>

        <Section title="Who we are">
          <p>
            {APP_NAME} is a chapter-operations platform built by {BUILDER.company} for
            members of Entrepreneurs' Organization (EO) chapters. This Privacy Policy
            describes what information the platform collects, how it is used, and the
            choices you have.
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li><strong>Account information:</strong> name, email address, phone number, and your role within your EO chapter (e.g., member, board member, chair).</li>
            <li><strong>Chapter context:</strong> chapter and forum membership, industry, EO join date, and other directory fields your chapter maintains.</li>
            <li><strong>Activity content:</strong> survey responses, reflections, lifeline entries, forum discussions, event RSVPs, parking-lot items, and similar content you create within the platform.</li>
            <li><strong>Authentication metadata:</strong> sign-in timestamps, the IP address used to authenticate, and the verification method (email magic link or SMS one-time passcode).</li>
            <li><strong>Minimal technical data:</strong> session cookies required to keep you signed in. We do not use third-party advertising trackers.</li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>To authenticate you and provide access to your chapter's content.</li>
            <li>To enable chapter operations: events, member directory, board reporting, surveys, and related features.</li>
            <li>To send transactional notifications you have opted into (e.g., event reminders, board broadcasts) within the app.</li>
            <li>To send SMS one-time passcodes when you choose phone-based sign-in.</li>
          </ul>
          <p className="mt-3">We do <strong>not</strong> use your information for marketing or advertising, and we do <strong>not</strong> sell or rent personal data to third parties.</p>
        </Section>

        <Section title="SMS-specific terms">
          <p>
            If you choose phone-based sign-in, we send a 6-digit one-time passcode to
            the phone number on file with your chapter. SMS messages are strictly
            transactional — used only when you initiate a sign-in. We do not send
            marketing, promotional, or broadcast SMS.
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
            <li>Reply <strong>STOP</strong> to any message to opt out of further SMS. Reply <strong>HELP</strong> for assistance.</li>
            <li>Message and data rates may apply; rates are set by your mobile carrier.</li>
            <li>Phone numbers are not shared with third parties except our SMS delivery provider (Twilio), which transmits the message and does not retain content for marketing.</li>
            <li>Opting out of SMS does not affect your account; you may continue to sign in via email magic link.</li>
          </ul>
        </Section>

        <Section title="Who can see your data">
          <p>
            Data visibility follows the role-based permissions configured by your
            chapter. In general:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
            <li>Personal content (reflections, lifeline entries, private survey answers) is visible only to you.</li>
            <li>Forum discussions are visible to members of that forum.</li>
            <li>Directory information (name, role, contact) is visible to your chapter's members and admins as configured.</li>
            <li>Chapter admins (board members, chairs, executive director) can access the data necessary to perform their roles.</li>
            <li>Super-admin access is limited to the platform operator for support and incident response, governed by an internal access policy.</li>
          </ul>
        </Section>

        <Section title="Service providers">
          <p>We rely on the following providers to operate the platform. They process data on our behalf under their own privacy and security commitments:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
            <li><strong>Supabase</strong> (database, authentication, file storage)</li>
            <li><strong>Vercel</strong> (web application hosting)</li>
            <li><strong>Twilio</strong> (SMS one-time passcode delivery)</li>
            <li><strong>Resend</strong> (email magic link delivery)</li>
          </ul>
          <p className="mt-3">No other third parties receive personal data from the platform.</p>
        </Section>

        <Section title="Retention">
          <p>
            We retain your account and content for as long as you remain an active
            member of your EO chapter. If you leave the chapter or request deletion,
            we will delete or anonymize your personal data within 30 days, except
            where retention is required by law or to resolve disputes.
          </p>
        </Section>

        <Section title="Your rights">
          <p>You may request to:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm">
            <li>Access the personal information we hold about you.</li>
            <li>Correct inaccurate information.</li>
            <li>Delete your account and personal content.</li>
            <li>Export your survey responses, reflections, and lifeline entries.</li>
            <li>Opt out of SMS authentication (you can continue using email magic links).</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, contact your chapter's Learning Chair or email <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="Children">
          <p>The platform is not intended for individuals under 18. We do not knowingly collect information from children.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes will
            be communicated through the in-app Beta Terms acknowledgment flow, which
            requires you to review and accept updates before continuing to use the
            platform.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or your data? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <footer className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <p>{APP_NAME} · Built by {BUILDER.company}</p>
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
