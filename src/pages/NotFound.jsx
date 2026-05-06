import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF1F5] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#002819] to-[#06402B] flex items-center justify-center">
          <MaterialSymbol icon="search_off" size={40} className="text-[#D4AF37]" />
        </div>
        
        <h1 className="text-6xl font-bold text-[#002819] mb-4">404</h1>
        <p className="text-xl text-[#404943] mb-8">Page not found</p>
        
        <p className="text-[#404943]/70 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition-all"
        >
          <MaterialSymbol icon="home" size={20} />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}