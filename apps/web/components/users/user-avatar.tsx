'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type UserAvatarProps = {
  name?: string | null;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const initials = (name?.trim() || 'N').slice(0, 2).toUpperCase();

  return (
    <Avatar className={className}>
      {imageUrl && <AvatarImage src={imageUrl} alt="" />}
      <AvatarFallback className={cn(fallbackClassName)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
