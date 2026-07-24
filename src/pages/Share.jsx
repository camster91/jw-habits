import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Share2, ExternalLink, Home, Link as LinkIcon, FileText, ArrowLeft } from 'lucide-react';
import { haptics } from '../utils/native';
import { extractUrlFromText, sanitizeOpenUrl } from '../utils/safeUrl';

function SharePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [openError, setOpenError] = useState('');

  const title = (searchParams.get('title') || '').slice(0, 500);
  const text = (searchParams.get('text') || '').slice(0, 4000);
  const urlParam = searchParams.get('url') || '';

  // Prefer explicit url=; Android often puts the link only in text=.
  const trustedUrl = useMemo(() => {
    return sanitizeOpenUrl(urlParam) || extractUrlFromText(text);
  }, [urlParam, text]);

  const untrustedHttpUrl = useMemo(() => {
    if (trustedUrl) return null;
    return (
      sanitizeOpenUrl(urlParam, { requireTrustedHost: false }) ||
      extractUrlFromText(text, { requireTrustedHost: false })
    );
  }, [trustedUrl, urlParam, text]);

  const displayUrl = trustedUrl || untrustedHttpUrl || '';
  const hasContent = title || text || displayUrl;

  const handleBack = () => {
    haptics.light();
    navigate('/');
  };

  const handleOpenLink = (raw, { warnExternal } = {}) => {
    setOpenError('');
    const safe = sanitizeOpenUrl(raw, { requireTrustedHost: !warnExternal });
    // For the external-confirm path we already validated http(s).
    const target =
      safe || (warnExternal ? sanitizeOpenUrl(raw, { requireTrustedHost: false }) : null);
    if (!target) {
      setOpenError('That link cannot be opened safely.');
      return;
    }
    haptics.light();
    const win = window.open(target, '_blank', 'noopener,noreferrer');
    if (!win) {
      setOpenError('Could not open the link (popup blocked).');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* iOS-style page top */}
      <h1 className="ios-large-title">
        <Share2 className="w-6 h-6 inline mr-2 text-primary/70" aria-hidden="true" />
        Shared Content
        <span className="sub">Content received via share</span>
      </h1>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        {hasContent ? (
          <>
            {/* Shared Content Card */}
            <div className="ios-grouped">
              <div className="p-4 space-y-4">
                {/* Title */}
                {title && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                        Title
                      </p>
                      <p className="font-semibold text-base-content mt-0.5">{title}</p>
                    </div>
                  </div>
                )}

                {/* Text */}
                {text && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                        Text
                      </p>
                      <p className="text-base-content/80 mt-0.5 whitespace-pre-wrap">{text}</p>
                    </div>
                  </div>
                )}

                {/* URL */}
                {displayUrl && (
                  <div className="flex items-start gap-3">
                    <LinkIcon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-base-content/70 uppercase tracking-wider">
                        URL
                      </p>
                      <p className="text-primary mt-0.5 break-all text-sm">{displayUrl}</p>
                    </div>
                  </div>
                )}

                {/* Open Link — trusted JW hosts */}
                {trustedUrl && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenLink(trustedUrl)}
                      className="btn btn-primary btn-block gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Link
                    </button>
                  </div>
                )}

                {/* External non-JW http(s) — require explicit confirm */}
                {untrustedHttpUrl && !trustedUrl && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs text-warning">
                      This link leaves JW Habits and is not a jw.org address. Only continue if you
                      trust the sender.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenLink(untrustedHttpUrl, { warnExternal: true })}
                      className="btn btn-outline btn-warning btn-block gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open external link
                    </button>
                  </div>
                )}

                {openError && (
                  <p className="text-sm text-error" role="alert">
                    {openError}
                  </p>
                )}
              </div>
            </div>

            {/* Back to Home */}
            <button type="button" onClick={handleBack} className="btn btn-outline btn-block gap-2">
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Share2 className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-base-content/70">No Shared Content</h2>
            <p className="text-sm text-base-content/70 mt-2 max-w-xs mx-auto">
              This page receives content shared from other apps. Try sharing a link or text to JW
              Habits.
            </p>
            <button type="button" onClick={handleBack} className="btn btn-primary mt-6 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SharePage;
