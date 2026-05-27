import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../services/auth';

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  setError('');
  setLoading(true);

  try {
    const result = await login({
      username: form.username.trim(),
      password: form.password,
    });

    if (!result.success) {
      setError(result.message || 'Login gagal');
      return;
    }

    navigate('/', { replace: true });
  } catch (err) {
    setError(
      err?.response?.data?.message ||
        'Username atau password salah'
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden min-h-[620px] overflow-hidden bg-slate-950 p-10 text-white lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-slate-950 to-slate-900" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-blue-700">
                  K
                </div>

                <div>
                  <h1 className="text-xl font-black tracking-tight">
                    KSB Pump Station
                  </h1>
                  <p className="text-sm font-semibold text-blue-100">
                    Monitoring & Control System
                  </p>
                </div>
              </div>

              <h2 className="max-w-md text-4xl font-black leading-tight">
                Smart Pump Monitoring Dashboard
              </h2>

              <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
                Pantau status pompa, data Modbus realtime, alarm, power line,
                dan kontrol operasi dari satu dashboard lokal.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <InfoBox title="4" subtitle="Pump Units" />
              <InfoBox title="105" subtitle="Modbus Tags" />
              <InfoBox title="TCP/IP" subtitle="Protocol" />
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] flex-col justify-center p-8 sm:p-12">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              Welcome Back
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Login ke sistem
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Masukkan username dan password operator untuk masuk dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <InputField
              label="Username"
              value={form.username}
              onChange={(value) => updateField('username', value)}
              placeholder="username"
            />

            <InputField
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) => updateField('password', value)}
              placeholder="*****"
            />

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-blue-700 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          
        </section>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function InfoBox({ title, subtitle }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
      <div className="text-2xl font-black">{title}</div>
      <div className="mt-1 text-xs font-bold text-slate-300">
        {subtitle}
      </div>
    </div>
  );
}