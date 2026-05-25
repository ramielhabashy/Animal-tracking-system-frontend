import React from 'react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';

export default function StaticPage({ slug: propSlug }) {
  const { slug: paramSlug } = useParams();
  const slug = propSlug || paramSlug;
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/pages/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPage(data.data);
      } else {
        setError('Page not found');
      }
    } catch (e) {
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <MaterialSymbol icon="hourglass" size={32} className="text-brand-primary animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-on-surface-subtle">
        <MaterialSymbol icon="error_outline" size={48} className="mb-4" />
        <p className="text-lg font-semibold">{error || 'Page not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-4xl font-bold text-brand-primary brand-font mb-8">{page.title}</h1>
      <div className="prose prose-lg max-w-none text-on-surface leading-relaxed whitespace-pre-line">
        {page.content}
      </div>
    </div>
  );
}
