import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import logoImg from '../../assets/ksb-logo.png';
import userIcon from '../../assets/icons/user.svg';

import dashboardIcon from '../../assets/icons/dashboard.svg';
import pumpIcon from '../../assets/icons/pump.svg';
import chartIcon from '../../assets/icons/chart.svg';
import cameraIcon from '../../assets/icons/camera.svg';
import settingsIcon from '../../assets/icons/settings.svg';

import { getCurrentUser, logout } from '../../services/auth';

const navItems = [
  {
    label: 'Dashboard',
    icon: dashboardIcon,
    path: '/',
  },
  {
    label: 'Live View',
    icon: cameraIcon,
    path: '/live-view',
  },
  {
    label: 'Data Logging',
    icon: chartIcon,
    path: '/data-logging',
  },
  {
    label: 'Setting',
    icon: settingsIcon,
    path: '/settings/modbus',
  },
  {
    label: 'Pump Details',
    icon: pumpIcon,
    path: '/pump-details',
  },
];

export default function Header() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [currentTime, setCurrentTime] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileRef = useRef(null);

  const userName = user?.name || user?.username || 'Administrator';

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setCurrentTime(new Date());
    }, 0);

    const intervalTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsProfileOpen(false);
      setIsMobileMenuOpen(false);
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const goHome = () => {
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="relative z-30 w-full shrink-0 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.16)]">
      <div className="flex min-h-[60px] w-full items-center gap-2 px-3 py-2 md:min-h-[64px] md:px-4 2xl:min-h-[72px] 2xl:px-7">
        {/* Burger mobile */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition hover:bg-slate-200 lg:hidden"
          aria-label="Open navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="flex w-4 flex-col gap-1">
            <span
              className={`h-0.5 rounded-full bg-slate-700 transition ${
                isMobileMenuOpen ? 'translate-y-1.5 rotate-45' : ''
              }`}
            />
            <span
              className={`h-0.5 rounded-full bg-slate-700 transition ${
                isMobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`h-0.5 rounded-full bg-slate-700 transition ${
                isMobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''
              }`}
            />
          </span>
        </button>

        {/* Logo + Title */}
        <button
          type="button"
          onClick={goHome}
          className="flex min-w-0 shrink-0 items-center gap-2 text-left md:gap-3 2xl:gap-5"
        >
          <img
            src={logoImg}
            alt="KSB Logo"
            className="h-7 w-auto shrink-0 object-contain md:h-8 2xl:h-9"
          />

          <div className="hidden min-w-0 max-w-[210px] sm:block lg:max-w-[260px] 2xl:max-w-[330px]">
            <h1 className="truncate text-[10px] font-bold leading-tight text-slate-950 lg:text-[11px] 2xl:text-sm">
              KSB AMACAN SERIES: 3-UNIT PUMP STATION
            </h1>

            <p className="truncate text-[10px] font-bold leading-tight text-slate-950 lg:text-[11px] 2xl:text-sm">
              MONITORING &amp; CONTROL SYSTEM
            </p>
          </div>
        </button>

        {/* Desktop / laptop navigation */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-2 lg:flex 2xl:gap-3">
          {navItems.map((item) => (
            <HeaderNavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              path={item.path}
            />
          ))}
        </nav>

        {/* Date + Profile */}
        <div className="ml-auto flex shrink-0 items-center gap-2 2xl:gap-4">
          <div className="hidden h-8 min-w-[170px] items-center justify-center rounded-xl bg-slate-200/70 px-3 text-[11px] font-medium text-slate-700 md:flex xl:min-w-[190px] 2xl:h-9 2xl:min-w-[230px] 2xl:px-6 2xl:text-sm">
            {formatDateTime(currentTime)}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 shadow-sm transition hover:bg-slate-200 2xl:h-10 2xl:w-10"
            >
              <img
                src={userIcon}
                alt="User"
                className="h-5 w-5 object-contain"
              />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-11 z-50 w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.22)] 2xl:top-12">
                <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                    <img
                      src={userIcon}
                      alt="User"
                      className="h-5 w-5 object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Logged in as
                    </p>

                    <p className="truncate text-sm font-bold text-slate-900">
                      {userName}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <p className="mb-3 text-sm font-medium text-slate-700">
                    Hi, {userName}!
                  </p>

                  {Number(user?.role_id) === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsMobileMenuOpen(false);
                        navigate('/admin/users');
                      }}
                      className="mb-3 flex h-10 w-full items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-800 transition hover:bg-slate-200"
                    >
                      User Management
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile burger dropdown */}
{/* Mobile burger floating dropdown */}
{isMobileMenuOpen && (
  <>
    <button
      type="button"
      aria-label="Close menu overlay"
      onClick={() => setIsMobileMenuOpen(false)}
      className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] lg:hidden"
    />

    <nav className="absolute left-3 right-3 top-[68px] z-50 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_45px_rgba(15,23,42,0.22)] lg:hidden">
      <div className="grid gap-2">
        {navItems.map((item) => (
          <HeaderNavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            path={item.path}
            compact
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-center text-[11px] font-medium text-slate-600 md:hidden">
        {formatDateTime(currentTime)}
      </div>
    </nav>
  </>
)}
    </header>
  );
}

function HeaderNavItem({
  icon,
  label,
  path,
  compact = false,
  onClick,
}) {
  return (
    <NavLink
      to={path}
      onClick={onClick}
      className={({ isActive }) => {
        const baseClass =
          'inline-flex shrink-0 items-center gap-2 rounded-xl font-semibold leading-none transition';

        const sizeClass = compact
          ? 'h-10 w-full justify-start px-3 text-sm'
          : 'h-8 justify-center px-2 text-[11px] xl:px-3 2xl:h-9 2xl:px-4 2xl:text-sm';

        const activeClass =
          'bg-slate-800 text-white shadow-sm';

        const inactiveClass =
          'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900';

        return `${baseClass} ${sizeClass} ${
          isActive ? activeClass : inactiveClass
        }`;
      }}
    >
      {({ isActive }) => (
        <>
          <img
            src={icon}
            alt=""
            className={
              isActive
                ? 'h-4 w-4 shrink-0 object-contain brightness-0 invert 2xl:h-5 2xl:w-5'
                : 'h-4 w-4 shrink-0 object-contain opacity-60 2xl:h-5 2xl:w-5'
            }
          />

          <span className="whitespace-nowrap">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function formatDateTime(date) {
  if (!date) return '-';

  const parts = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type) => {
    return parts.find((part) => part.type === type)?.value || '';
  };

  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const second = getPart('second');

  return `${day} ${month} ${year} ${hour}:${minute}:${second}`;
}