export default function SidebarButton({ icon, alt, active = false }) {
  return (
    <button
      type="button"
      className={
        active
          ? 'flex h-11 w-11 items-center justify-center rounded bg-slate-800 shadow-sm'
          : 'flex h-11 w-11 items-center justify-center rounded bg-white shadow-sm transition hover:bg-slate-100'
      }
    >
      <img
        src={icon}
        alt={alt}
        className={
          active
            ? 'h-5 w-5 object-contain brightness-0 invert'
            : 'h-5 w-5 object-contain'
        }
      />
    </button>
  );
}