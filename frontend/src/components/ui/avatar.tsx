import { cn, initials } from '@/lib/utils';
import { AVATAR_COLORS } from '@/lib/prefs';
import type { UserPreferences } from '@/lib/api';

/** La foto de perfil del usuario, o sus iniciales sobre su color si no subió foto. */
export function Avatar({
  name,
  preferences,
  className,
}: {
  name: string;
  preferences?: UserPreferences;
  className?: string;
}) {
  const photo = preferences?.avatar;
  const color = preferences?.avatarColor ?? AVATAR_COLORS[0];
  return (
    <span
      className={cn('grid shrink-0 place-items-center overflow-hidden font-display font-bold text-white', className)}
      style={{ background: color, borderRadius: '5px' }}
    >
      {photo ? <img src={photo} alt={`Foto de ${name}`} className="size-full object-cover" /> : initials(name)}
    </span>
  );
}