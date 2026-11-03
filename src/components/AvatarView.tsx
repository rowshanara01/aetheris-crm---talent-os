import { useState } from 'react';
import avatarAdmin from '../assets/images/avatar_admin_director_1793538651743.jpg';
import avatarCandidate from '../assets/images/avatar_lead_candidate_1793538651674.jpg';
import avatarClient from '../assets/images/avatar_enterprise_client_1793538653399.jpg';

const AVATAR_MAP: Record<string, string> = {
  admin: avatarAdmin,
  candidate: avatarCandidate,
  client: avatarClient,
};

interface AvatarViewProps {
  name: string;
  avatarKey?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarView({ name, avatarKey, size = 'md' }: AvatarViewProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs';

  const resolvedSrc = avatarKey ? AVATAR_MAP[avatarKey] : undefined;

  if (resolvedSrc && !imgFailed) {
    return (
      <img
        src={resolvedSrc}
        alt={`${name} portrait`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClass} rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center shrink-0 select-none`}
    >
      {initials || 'AE'}
    </div>
  );
}
