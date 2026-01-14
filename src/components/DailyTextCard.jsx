import { format } from 'date-fns';
import { BookOpen, Check, ExternalLink } from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import { getDailyTextLink } from '../utils/jwLibraryLinks';

function DailyTextCard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');
  const { isDailyTextRead, markDailyTextRead } = useProgressStore();
  const isRead = isDailyTextRead(today);

  const dailyTextLink = getDailyTextLink(new Date());

  const handleMarkRead = () => {
    markDailyTextRead(today);
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="card-title text-lg">Daily Text</h2>
          </div>
          {isRead && (
            <div className="badge badge-success gap-2">
              <Check className="w-4 h-4" />
              Read
            </div>
          )}
        </div>

        <p className="text-sm text-base-content/70">{todayFormatted}</p>

        <div className="divider my-2"></div>

        <div className="space-y-3">
          <p className="text-base-content/80">
            Read today's daily text and scripture in JW Library for the full experience.
          </p>

          <a
            href={dailyTextLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-primary w-full"
          >
            <ExternalLink className="w-4 h-4" />
            Open in JW Library
          </a>
        </div>

        <div className="card-actions justify-end mt-4">
          {!isRead && (
            <button
              onClick={handleMarkRead}
              className="btn btn-primary btn-sm"
            >
              <Check className="w-4 h-4" />
              Mark as Read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyTextCard;
