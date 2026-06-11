'use client';
import { useAppStore } from '@/lib/store';

export const FavoriteButton = ({ personId }: { personId: number }) => {
  const isFav = useAppStore((s) => s.favorites.includes(personId));
  const toggle = useAppStore((s) => s.toggleFavorite);
  return (
    <button
      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => { e.stopPropagation(); toggle(personId); }}
      className={`cursor-pointer text-sm transition ${isFav ? 'text-pos' : 'text-dim hover:text-pos/70'}`}
    >
      {isFav ? '★' : '☆'}
    </button>
  );
};
