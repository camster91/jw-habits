import { useTranslation } from 'react-i18next';
import { Lightbulb, ExternalLink } from 'lucide-react';

/**
 * Ideas page — replaced by a simple link-out to jw.org. The
 * previous version embedded a GoalsTab + ProjectsTab with full
 * CRUD on local goals/projects. The launchpad version of the
 * app doesn't track anything internally; users who want goal
 * ideas are pointed at jw.org's own content.
 *
 * Reachable from the side drawer for power users who want
 * inspiration. Most users will just tap a habit on the home and
 * be sent to jw.org directly.
 */
function IdeasPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-base-200 pb-16">
      <h1 className="ios-large-title">
        <Lightbulb className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
        {t('goals.ideas', 'Ideas')}
        <span className="sub">
          {t('goals.browseIdeas', 'Find inspiration on jw.org')}
        </span>
      </h1>

      <main className="container mx-auto px-4 pt-4 max-w-2xl">
        <div className="ios-grouped">
          <a
            href="https://www.jw.org/en/bible-teachings/family/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
          >
            <div className="ios-icon pink">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="body">
              <div className="title">Family Bible activities</div>
              <div className="sub">Talk prompts, videos, and discussion ideas for your family</div>
            </div>
            <ExternalLink className="ios-chev" />
          </a>
          <a
            href="https://www.jw.org/en/bible-teachings/teenagers/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
          >
            <div className="ios-icon blue">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="body">
              <div className="title">For teens</div>
              <div className="sub">Articles and videos aimed at teenagers</div>
            </div>
            <ExternalLink className="ios-chev" />
          </a>
          <a
            href="https://www.jw.org/en/bible-teachings/peace-happiness/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
          >
            <div className="ios-icon orange">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="body">
              <div className="title">Peace &amp; happiness</div>
              <div className="sub">Articles on applying Bible principles to daily life</div>
            </div>
            <ExternalLink className="ios-chev" />
          </a>
          <a
            href="https://www.jw.org/en/bible-teachings/tools/"
            target="_blank"
            rel="noopener noreferrer"
            className="ios-row focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
          >
            <div className="ios-icon teal">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="body">
              <div className="title">Bible study tools</div>
              <div className="sub">Deeper study resources, study guides, and worksheets</div>
            </div>
            <ExternalLink className="ios-chev" />
          </a>
        </div>
      </main>
    </div>
  );
}

export default IdeasPage;
