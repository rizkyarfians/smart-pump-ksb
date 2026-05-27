export default function CommandSuccessModal({
  open,
  message,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg
            viewBox="0 0 24 24"
            className="h-9 w-9 text-emerald-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-950">
          Berhasil
        </h2>

        <p className="mt-2 text-sm font-medium text-slate-600">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-11 w-full rounded-xl bg-emerald-500 text-sm font-bold text-white transition hover:bg-emerald-600"
        >
          OK
        </button>
      </div>
    </div>
  );
}