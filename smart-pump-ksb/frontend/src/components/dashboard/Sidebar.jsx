import SidebarButton from './SidebarButton';

import dashboardIcon from '../../assets/icons/dashboard.svg';
import menuIcon from '../../assets/icons/power.svg';
import cameraIcon from '../../assets/icons/camera.svg';
import settingsIcon from '../../assets/icons/settings.svg';

export default function Sidebar() {
  return (
    <aside className="hidden flex-col items-center bg-[#f4f4f4] py-36 lg:flex xl:py-44">
      <nav className="flex flex-col items-center gap-8 xl:gap-9">
        <SidebarButton
          icon={dashboardIcon}
          alt="Dashboard"
          active
        />

        <SidebarButton
          icon={menuIcon}
          alt="Menu"
        />

        <SidebarButton
          icon={cameraIcon}
          alt="Camera"
        />
      </nav>

      <div className="mt-auto">
        <SidebarButton
          icon={settingsIcon}
          alt="Settings"
        />
      </div>
    </aside>
  );
}