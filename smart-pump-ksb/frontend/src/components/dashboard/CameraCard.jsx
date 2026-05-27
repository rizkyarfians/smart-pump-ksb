import { useNavigate } from 'react-router-dom';

const CAMERA_STREAM_URL = 'http://localhost:5000/api/camera/mjpeg';

export default function CameraPreviewCard() {
  const navigate = useNavigate();

  const goToLiveView = () => {
    navigate('/live-view');
  };

  return (
    <section
      role="button"
      tabIndex={0}
      onClick={goToLiveView}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          goToLiveView();
        }
      }}
      className="group relative flex h-full min-h-0 cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-950">
        <img
          src={CAMERA_STREAM_URL}
          alt="Live camera preview"
          className="h-full w-full object-cover"
        />

        <div className="absolute left-4 top-4 z-10 rounded-xl bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md">
          <div className="text-sm font-black text-slate-950">
            Camera
          </div>

          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Live Preview
          </div>
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/0 opacity-0 transition duration-200 group-hover:bg-slate-950/45 group-hover:opacity-100">
          <div className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg">
            Show Detail
          </div>
        </div>
      </div>
    </section>
  );
}