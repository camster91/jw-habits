import { useTranslation } from 'react-i18next';
import { Shield, ExternalLink, Mail, Heart } from 'lucide-react';

/**
 * About page — full disclaimer for JW Habits.
 *
 * Required content per JW.org Terms of Use (jw.org/en/terms-use/):
 *   - Identify the app as unofficial third-party
 *   - Identify the developer (Ashbi Design)
 *   - Disclaim affiliation with Watch Tower Bible and Tract Society
 *   - Disclaim any reproduction of jw.org content
 *   - Link to the official Terms of Use and Privacy Policy
 *   - Provide Watchtower Developer Support contact for takedown
 *
 * Styled to match the iOS design system introduced in Phase 1.5.
 */
export default function About() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* iOS sticky top bar (same as Home) */}
      <div
        className="sticky top-0 z-30 backdrop-blur-lg bg-base-200/80 border-b border-base-300/30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="container mx-auto px-4 max-w-2xl flex items-center justify-between h-12">
          <a
            href="/"
            className="text-[15px] text-[var(--ios-blue,#007AFF)] font-normal no-underline"
            style={{ textDecoration: 'none' }}
          >
            ← Home
          </a>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-base-content/70">
              {t('appName', 'JW Habits')}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="ios-large-title">About</h1>

        {/* Disclaimer section */}
        <div className="ios-grouped">
          <div className="ios-row" style={{ minHeight: 64, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16 }}>
            <div className="ios-icon" style={{ background: 'rgba(0,122,255,0.14)', marginTop: 2 }}>
              <Shield style={{ color: 'var(--ios-blue, #007AFF)' }} />
            </div>
            <div className="body">
              <div className="title" style={{ fontWeight: 600 }}>Unofficial third-party tool</div>
              <div className="sub" style={{ marginTop: 4, lineHeight: 1.4 }}>
                JW Habits is an unofficial, third-party habit tracker designed for Jehovah's Witnesses.
                It is not affiliated with, endorsed by, or sponsored by Watch Tower Bible and Tract Society of Pennsylvania, jw.org, or Jehovah's Witnesses.
              </div>
            </div>
          </div>
        </div>

        <h2 className="ios-section-h">Content</h2>
        <div className="ios-grouped">
          <div className="ios-row" style={{ minHeight: 64, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16 }}>
            <div className="ios-icon" style={{ background: 'var(--ios-green, #34C759)', marginTop: 2 }}>
              <ExternalLink style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title" style={{ fontWeight: 600 }}>No content is reproduced</div>
              <div className="sub" style={{ marginTop: 4, lineHeight: 1.4 }}>
                All Bible text, publications, videos, and audio are accessed by linking to the official jw.org website and the official JW Library app. This app does not host, reproduce, or modify any jw.org content.
              </div>
            </div>
          </div>
          <div className="ios-row">
            <div className="ios-icon" style={{ background: 'var(--ios-orange, #FF9500)' }}>
              <Heart style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title">What the app does</div>
              <div className="sub">Tracks personal spiritual habits: daily text checkoff, prayers, Bible reading plan, family worship planning, meeting preparation, and ministry hours. Builds streaks. No accounts, no tracking, no data leaves your device.</div>
            </div>
          </div>
        </div>

        <h2 className="ios-section-h">Official links</h2>
        <div className="ios-grouped">
          <a
            href="https://www.jw.org/en/terms-use/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row"
            style={{ textDecoration: 'none' }}
          >
            <div className="ios-icon" style={{ background: 'var(--ios-blue, #007AFF)' }}>
              <ExternalLink style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title">jw.org Terms of Use</div>
              <div className="sub">Opens on jw.org</div>
            </div>
            <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
          <a
            href="https://www.jw.org/en/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row"
            style={{ textDecoration: 'none' }}
          >
            <div className="ios-icon" style={{ background: 'var(--ios-indigo, #5856D6)' }}>
              <ExternalLink style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title">jw.org Privacy Policy</div>
              <div className="sub">Opens on jw.org</div>
            </div>
            <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
          <a
            href="https://www.jw.org/en/online-help/jw-library/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row"
            style={{ textDecoration: 'none' }}
          >
            <div className="ios-icon" style={{ background: 'var(--ios-teal, #5AC8FA)' }}>
              <ExternalLink style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title">JW Library (official app)</div>
              <div className="sub">The official Watchtower Bible and Tract Society app</div>
            </div>
            <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
        </div>

        <h2 className="ios-section-h">Contact</h2>
        <div className="ios-grouped">
          <a
            href="mailto:DeveloperSupport@jw.org?subject=JW%20Habits%20app%20inquiry"
            className="ios-row"
            style={{ textDecoration: 'none' }}
          >
            <div className="ios-icon" style={{ background: 'var(--ios-blue, #007AFF)' }}>
              <Mail style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title">Watchtower Developer Support</div>
              <div className="sub">DeveloperSupport@jw.org · for permission / takedown requests</div>
            </div>
            <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
          <a
            href="mailto:support@ashbi.ca?subject=JW%20Habits"
            className="ios-row"
            style={{ textDecoration: 'none' }}
          >
            <div className="ios-icon" style={{ background: 'var(--ios-orange, #FF9500)' }}>
              <Mail style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title">App feedback</div>
              <div className="sub">support@ashbi.ca · for bug reports and feature requests</div>
            </div>
            <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
        </div>

        <h2 className="ios-section-h">About this app</h2>
        <div className="ios-grouped">
          <div className="ios-row" style={{ minHeight: 64, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16 }}>
            <div className="ios-icon" style={{ background: 'var(--ios-blue, #007AFF)', marginTop: 2 }}>
              <Heart style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title" style={{ fontWeight: 600 }}>Built with care for JWs who want a habit tracker</div>
              <div className="sub" style={{ marginTop: 4, lineHeight: 1.4 }}>
                JW Habits is built by Ashbi Design, a Canadian web studio. We are Jehovah's Witnesses ourselves and built this app to help our own family stay regular with spiritual habits. We're sharing it because we thought other JWs might find it useful.
              </div>
            </div>
          </div>
        </div>

        <h2 className="ios-section-h">App privacy policy</h2>
        <div className="ios-grouped">
          <a
            href="https://ashbi.ca/privacy/jw-habits.html"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row"
            style={{ textDecoration: 'none' }}
          >
            <div className="ios-icon" style={{ background: 'var(--ios-purple, #AF52DE)' }}>
              <ExternalLink style={{ color: 'white' }} />
            </div>
            <div className="body">
              <div className="title">JW Habits privacy policy</div>
              <div className="sub">Opens on ashbi.ca — what data we store (on-device only)</div>
            </div>
            <svg className="ios-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
        </div>

        <div className="ios-footer">
          JW Habits v4.1.0 · built by Ashbi Design
        </div>
      </div>
    </div>
  );
}
