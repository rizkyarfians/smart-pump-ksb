import dashboardIcon from '../../assets/icons/dashboard.svg';
import powerIcon from '../../assets/icons/power.svg';
import cameraIcon from '../../assets/icons/camera.svg';
import settingsIcon from '../../assets/icons/settings.svg';

const navItems = [
  {
    label: 'Dashboard',
    icon: dashboardIcon,
    active: true,
  },
  {
    label: 'Power Line Distribution',
    icon: powerIcon,
  },
  {
    label: 'Live View',
    icon: cameraIcon,
  },
  {
    label: 'Setting',
    icon: settingsIcon,
  },
];

export default function DashboardTopBar() {
  return (
    <div className="mb-3 grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center">
      <div />

      <nav className="flex items-center justify-center gap-3">
        {navItems.map((item) => (
          <TopBarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={item.active}
          />
        ))}
      </nav>

      <div className="justify-self-end">
        <div className="flex h-9 items-center justify-center rounded-xl bg-slate-200/70 px-8 text-sm font-medium text-slate-700">
          12 Mei 2026 23:30:00
        </div>
      </div>
    </div>
  );
}

function TopBarItem({ icon, label, active = false }) {
  return (
    <button
      type="button"
      className={
  active
    ? 'inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-semibold leading-none text-white shadow-sm'
    : 'inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-200/70 px-4 text-sm font-semibold leading-none text-slate-600 transition hover:bg-slate-300/80 hover:text-slate-900'
}
    >
      <img
        src={icon}
        alt=""
        className={
          active
            ? 'h-5 w-5 shrink-0 object-contain brightness-0 invert'
            : 'h-5 w-5 shrink-0 object-contain opacity-60'
        }
      />

      <span className="whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}