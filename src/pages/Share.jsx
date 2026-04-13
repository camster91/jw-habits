import { useSearchParams, useNavigate } from 'react-router-dom';
import { Share2, ExternalLink, Home, Link as LinkIcon, FileText, ArrowLeft } from 'lucide-react';
import { haptics } from '../utils/native';

function SharePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const title = searchParams.get('title') || '';
  const text = searchParams.get('text') || '';
  const url = searchParams.get('url') || '';

  const hasContent = title || text || url;

  const handleBack = () => {
    haptics.light();
    navigate('/');
  };

  const handleOpenLink = () => {
    if (url) {
      haptics.light();
      // Prevent XSS: only allow http/https URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      {/* Header */}
      <header
        className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300/10 rounded-full blur-3xl" />
        </div>
        <div className="relative p-6">
          <div className="flex items-center gap-3">
            <Share2 className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Shared Content</h1>
              <p className="text-sm opacity-90">Content received via share</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        {hasContent ? (
          <>
            {/* Shared Content Card */}
            <div className="card bg-base-100 shadow-md">
              <div className="card-body p-5 space-y-4">
                {/* Title */}
                {title && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">Title</p>
                      <p className="font-semibold text-base-content mt-0.5">{title}</p>
                    </div>
                  </div>
                )}

                {/* Text */}
                {text && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">Text</p>
                      <p className="text-base-content/80 mt-0.5 whitespace-pre-wrap">{text}</p>
                    </div>
                  </div>
                )}

                {/* URL */}
                {url && (
                  <div className="flex items-start gap-3">
                    <LinkIcon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-base-content/50 uppercase tracking-wider">URL</p>
                      <p className="text-primary mt-0.5 break-all text-sm">{url}</p>
                    </div>
                  </div>
                )}

                {/* Open Link Button */}
                {url && (
                  <div className="pt-2">
                    <button
                      onClick={handleOpenLink}
                      className="btn btn-primary btn-block gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Link
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Back to Home */}
            <button
              onClick={handleBack}
              className="btn btn-outline btn-block gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <Share2 className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-base-content/70">No Shared Content</h2>
            <p className="text-sm text-base-content/50 mt-2 max-w-xs mx-auto">
              This page receives content shared from other apps. Try sharing a link or text to JW Habits.
            </p>
            <button
              onClick={handleBack}
              className="btn btn-primary mt-6 gap-2"
            >
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