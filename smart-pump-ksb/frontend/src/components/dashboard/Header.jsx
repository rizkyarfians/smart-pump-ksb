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
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="relative z-30 flex h-[72px] w-full shrink-0 items-center justify-between bg-white px-7 shadow-[0_6px_18px_rgba(15,23,42,0.16)]">
      {/* Logo + Title */}
      <div className="flex min-w-0 items-center gap-5">
        <img
          src={logoImg}
          alt="KSB Logo"
          className="h-9 w-auto shrink-0 object-contain"
        />

        <div className="min-w-[300px]">
          <h1 className="text-sm font-bold leading-tight text-slate-950">
            KSB AMACAN SERIES: 3-UNIT PUMP STATION
          </h1>

          <p className="text-sm font-bold leading-tight text-slate-950">
            MONITORING &amp; CONTROL SYSTEM
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="hidden items-center justify-center gap-3 xl:flex">
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
      <div className="flex shrink-0 items-center gap-4">
        <div className="flex h-9 min-w-[230px] items-center justify-center rounded-xl bg-slate-200/70 px-6 text-sm font-medium text-slate-700">
          {formatDateTime(currentTime)}
        </div>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 shadow-sm transition hover:bg-slate-200"
          >
            <img
              src={userIcon}
              alt="User"
              className="h-5 w-5 object-contain"
            />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
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
    </header>
  );
}

function HeaderNavItem({ icon, label, path }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        isActive
          ? 'inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-semibold leading-none text-white shadow-sm'
          : 'inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-transparent px-4 text-sm font-semibold leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'
      }
    >
      {({ isActive }) => (
        <>
          <img
            src={icon}
            alt=""
            className={
              isActive
                ? 'h-5 w-5 shrink-0 object-contain brightness-0 invert'
                : 'h-5 w-5 shrink-0 object-contain opacity-60'
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