import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Wallet, Menu, X } from 'lucide-react';
import { useBookingStore } from '../../modules/ticketer/store/useBookingStore';
import CashbackModal from '../../modules/ticketer/components/modals/CashbackModal';
import SalesOverviewModal from '../../modules/ticketer/components/SalesOverviewModal';
import logo from '../../assets/images/logo.webp';

const Header: React.FC = () => {
  const [isCashbackModalOpen, setIsCashbackModalOpen] = React.useState(false);
  const [isSalesOverviewOpen, setIsSalesOverviewOpen] = React.useState(false);
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const user = useBookingStore((state) => state.user);

  // close mobile nav when viewport grows
  React.useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768 && isNavOpen) {
        setIsNavOpen(false);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [isNavOpen]);

  // Format wallet balance
  const formattedBalance = user
    ? `₦${user.walletBalance.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '₦0.00';

  if (!user) return null;
  return (
    <header className="w-full">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-border-gray h-[50px] flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm relative">
        {/* Left Section */}
        <div className="flex items-center gap-4 md:gap-8">
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-text-gray hover:text-primary-blue transition-colors"
            onClick={() => setIsNavOpen((prev) => !prev)}
            aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
          >
            {isNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center cursor-pointer group">
            <img 
              src={logo} 
              alt="TABIX Logo" 
              className="h-8 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Navigation Links */}
          <ul className="hidden md:flex items-center gap-7">
            <li>
              <Link
                to="/bus-status"
                className="text-text-gray text-sm font-medium hover:text-primary-blue transition-colors relative group"
              >
                Bus Status
                <span className="absolute -bottom-4 left-0 w-0 h-0.5 bg-primary-blue transition-all duration-300 group-hover:w-full" />
              </Link>
            </li>
            <li>
              <button
                onClick={() => setIsSalesOverviewOpen(true)}
                className="text-text-gray text-sm font-medium hover:text-primary-blue transition-colors relative group"
              >
                Overview
                <span className="absolute -bottom-4 left-0 w-0 h-0.5 bg-primary-blue transition-all duration-300 group-hover:w-full" />
              </button>
            </li>
          </ul>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Cashback Button */}
          <button 
            onClick={() => setIsCashbackModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-cashback-green text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(0,214,101,0.25)] hover:bg-[#00C05B] hover:shadow-[0_4px_12px_rgba(0,214,101,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline whitespace-nowrap">
              Get 0.25% Cashback!
            </span>
          </button>

          {/* Wallet Button */}
          <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary-blue text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(0,149,255,0.25)] hover:bg-[#0086E6] hover:shadow-[0_4px_12px_rgba(0,149,255,0.35)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline whitespace-nowrap">
              {formattedBalance}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile navigation menu */}
      {isNavOpen && (
        <div className="md:hidden bg-white border-b border-border-gray shadow-sm absolute top-[50px] left-0 w-full z-40">
          <ul className="flex flex-col">
            <li>
              <Link
                to="/bus-status"
                onClick={() => setIsNavOpen(false)}
                className="block px-6 py-3 text-text-gray text-sm font-medium hover:bg-gray-100"
              >
                Bus Status
              </Link>
            </li>
            <li>
              <button
                onClick={() => {
                  setIsSalesOverviewOpen(true);
                  setIsNavOpen(false);
                }}
                className="w-full text-left px-6 py-3 text-text-gray text-sm font-medium hover:bg-gray-100"
              >
                Overview
              </button>
            </li>
          </ul>
        </div>
      )}

      {/* User Profile Banner */}
      <div className="relative bg-gradient-to-r from-brand-blue-dark to-brand-blue-light py-8 px-6 text-white text-center overflow-hidden">
        {/* Animated Background Effect */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_0%,_transparent_70%)] animate-pulse-slow" />

        {/* Content */}
        <div className="relative z-10">
          <div className="text-[11px] font-medium tracking-wider opacity-85 uppercase mb-2">
            USER ID: {user.id}
          </div>
          <h1 className="font-display text-[32px] font-bold tracking-tight mb-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            {user.name}
          </h1>
          <div className="text-sm font-medium opacity-90">
            Role: {user.role}
          </div>
        </div>
      </div>
      <CashbackModal 
        isOpen={isCashbackModalOpen} 
        onClose={() => setIsCashbackModalOpen(false)} 
      />
      <SalesOverviewModal
        isOpen={isSalesOverviewOpen}
        onClose={() => setIsSalesOverviewOpen(false)}
      />
    </header>
  );
};

export default Header;
