import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useAuth } from '../context/AuthContext';

export default function Forbidden() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (user?.role === 'Admin') {
      navigate('/dashboard');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF1F5] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
          <MaterialSymbol icon="lock" size={40} className="text-red-600" />
        </div>
        
        <h1 className="text-6xl font-bold text-[#BA1A1A] mb-4">403</h1>
        <p className="text-xl text-[#404943] mb-4">Access Forbidden</p>
        
        <p className="text-[#404943]/70 mb-2">
          You don't have permission to access this page.
        </p>
        <p className="text-sm text-[#404943]/50 mb-8">
          Current role: <span className="font-semibold text-[#002819]">{user?.role || 'Guest'}</span>
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition-all"
          >
            <MaterialSymbol icon="arrow_back" size={20} />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#002819] text-[#002819] rounded-xl font-bold hover:bg-[#002819]/5 transition-all"
          >
            <MaterialSymbol icon="logout" size={20} />
            Login as Different User
          </button>
        </div>
      </div>
    </div>
  );
}