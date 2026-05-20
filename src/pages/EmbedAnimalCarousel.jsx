import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';

export default function EmbedAnimalCarousel() {
  const [searchParams] = useSearchParams();
  const { t, dir, setLocale } = useI18n();
  const isRtl = dir === 'rtl';
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(null);

  useEffect(() => {
    const lang = searchParams.get('lang');
    if (lang && setLocale) setLocale(lang);
    fetchAnimals();
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, []);

  useEffect(() => {
    if (loading || animals.length === 0) return;
    autoScrollRef.current = setInterval(() => {
      if (!scrollRef.current) return;
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      if (scrollRef.current.scrollLeft >= maxScroll - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      }
    }, 4000);
    return () => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); };
  }, [loading, animals.length]);

  const fetchAnimals = async () => {
    try {
      const res = await apiFetch('/api/embed/animals');
      if (res.ok) {
        const data = await res.json();
        setAnimals(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch animals:', e);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const getSpeciesIcon = (species) => {
    const map = { Camel: 'camel', Goat: 'goat', Sheep: 'sheep' };
    return map[species] || 'pets';
  };

  const getAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const months = (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth();
    if (months < 12) return `${months}mo`;
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    return rem ? `${yrs}y ${rem}mo` : `${yrs}y`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface-light">
        <div className="animate-spin w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (animals.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface-light">
        <p className="text-on-surface-subtle text-sm font-medium">No animals listed</p>
      </div>
    );
  }

  return (
    <div className="relative bg-surface-light py-4 px-2">
      <div className="flex items-center justify-between mb-3 px-2">
        <p className="text-sm font-bold text-brand-primary flex items-center gap-1">
          <MaterialSymbol icon="pets" size={16} />
          {t('nav.animals') || 'Animals'}
        </p>
        <a
          href="/react.oasis/animals"
          target="_top"
          className="text-[10px] font-medium text-brand-accent hover:underline"
        >
          {t('common.viewAll') || 'View All'}
        </a>
      </div>

      <div className="relative group">
        {animals.length > 3 && (
          <>
            <button
              onClick={() => scroll('left')}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white transition opacity-0 group-hover:opacity-100 ${isRtl ? 'right-0 left-auto' : ''}`}
            >
              <MaterialSymbol icon={isRtl ? 'chevron_right' : 'chevron_left'} size={20} className="text-brand-primary" />
            </button>
            <button
              onClick={() => scroll('right')}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white transition opacity-0 group-hover:opacity-100 ${isRtl ? 'left-0 right-auto' : ''}`}
            >
              <MaterialSymbol icon={isRtl ? 'chevron_left' : 'chevron_right'} size={20} className="text-brand-primary" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1 no-scrollbar"
        >
          {animals.map(animal => {
            const imageUrl = animal.image ? storageUrl(animal.image) : null;
            return (
              <a
                key={animal.id}
                href={`/react.oasis/animals/${animal.id}`}
                target="_top"
                className="flex-none w-44 bg-white rounded-xl border border-[#eeeee9] overflow-hidden hover:shadow-md hover:border-brand-accent/30 transition-all group/card"
              >
                <div className="h-28 bg-gradient-to-br from-[#f4f4ef] to-[#e8e8e0] relative overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={animal.animal_id} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MaterialSymbol icon={getSpeciesIcon(animal.species)} size={32} className="text-brand-accent/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white bg-brand-primary/70">
                      {animal.species}
                    </span>
                  </div>
                </div>
                <div className="p-2.5">
                  <h3 className="font-bold text-brand-primary text-xs truncate group-hover/card:text-brand-accent transition-colors">
                    {animal.name || animal.animal_id}
                  </h3>
                  <p className="text-[10px] text-on-surface-subtle mt-0.5 truncate">
                    {animal.animal_id}{animal.breed ? ` · ${animal.breed}` : ''}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#f0f0eb] text-[10px] text-on-surface-variant">
                    <span>{animal.weight ? `${animal.weight} kg` : ''}</span>
                    {animal.owner && <span className="truncate max-w-[60px]">{animal.owner.name}</span>}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div className="text-center mt-3 text-[9px] text-on-surface-subtle">
        {t('embedCodesSection.poweredBy') || 'Powered by'}{' '}
        <a href="/react.oasis/" target="_top" className="text-brand-primary font-semibold hover:underline">
          Oasis Trace
        </a>
      </div>
    </div>
  );
}
