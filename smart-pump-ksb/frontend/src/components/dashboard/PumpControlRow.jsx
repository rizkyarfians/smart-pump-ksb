import { useState } from 'react';

import { sendPumpCommand } from '../../services/pumpControl';

import PinConfirmModal from './PinConfirmModal';
import CommandSuccessModal from './CommandSuccessModal';

import amarexImg from '../../assets/pumps/amarex.png';
import amacanImg from '../../assets/pumps/amacan.png';

export default function PumpControlRow({
  pumpId,
  number,
  name,
  mode = 'Auto',

  runHour = '-',

  power = null,
  powerUnit = 'kW',

  current = null,
  currentUnit = 'A',

  voltage = null,
  voltageUnit = 'V',

  speedActual = null,
  speedActualUnit = 'RPM',
}) {
  const [speedRef, setSpeedRef] = useState('');
  const [loadingCommand, setLoadingCommand] = useState(null);

  const [pendingCommand, setPendingCommand] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  const isAuto = String(mode).toLowerCase() === 'auto';

  const pumpImage = String(name).toLowerCase().includes('amarex')
    ? amarexImg
    : amacanImg;

  const requestCommand = (command) => {
    if (command === 'SUBMIT_SPEED_REF' && !speedRef.trim()) {
      setPinError('Speed ref is required');
      setPendingCommand(command);
      return;
    }

    setPendingCommand(command);
    setPin('');
    setPinError('');
  };

  const cancelCommand = () => {
    setPendingCommand(null);
    setPin('');
    setPinError('');
  };

  const confirmCommand = async () => {
    if (!pendingCommand) return;

    if (!pin.trim()) {
      setPinError('PIN is required');
      return;
    }

    const commandToSend = pendingCommand;
    const submittedSpeedRef = speedRef;

    try {
      setLoadingCommand(commandToSend);
      setPinError('');

      const payload = {
        pumpId,
        pumpName: name,
        command: commandToSend,
        speedRef:
          commandToSend === 'SUBMIT_SPEED_REF'
            ? submittedSpeedRef
            : '',
        operatorPin: pin,
        timestamp: new Date().toISOString(),
      };

      await sendPumpCommand(payload);

      setPendingCommand(null);
      setPin('');
      setPinError('');

      setSuccessMessage(
        getSuccessMessage(commandToSend, name, submittedSpeedRef),
      );

      if (commandToSend === 'SUBMIT_SPEED_REF') {
        setSpeedRef('');
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        'Failed to execute command';

      setPinError(message);
    } finally {
      setLoadingCommand(null);
    }
  };

  return (
    <>
      <article className="grid h-full min-h-[58px] grid-cols-[36px_54px_130px_minmax(0,1fr)_310px] items-stretch gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-0">
  <PumpNumber number={number} />

  <PumpVisual image={pumpImage} />

  <PumpIdentity
    name={name}
    mode={mode}
    isAuto={isAuto}
  />

  <div className="grid h-full grid-cols-5 items-center gap-3">
    <Metric label="Run Hour" value={formatRunHour(runHour)} />

    <Metric
      label="Power"
      value={formatMetricValue(power, powerUnit)}
    />

    <Metric
      label="Current"
      value={formatMetricValue(current, currentUnit)}
    />

    <Metric
      label="Voltage"
      value={formatMetricValue(voltage, voltageUnit)}
    />

    <Metric
      label="Speed"
      value={formatMetricValue(speedActual, speedActualUnit)}
    />
  </div>

  <div className="grid h-full grid-cols-[132px_46px_58px_58px] items-center gap-2">
    <div className="flex h-9 min-w-0 items-center overflow-hidden rounded-lg border border-blue-200 bg-blue-50/60 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex h-full items-center bg-blue-100 px-1.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">
  REF
</div>



      <input
  type="number"
  value={speedRef}
  onChange={(e) => setSpeedRef(e.target.value)}
  placeholder="Speed"
  className="h-full min-w-[56px] flex-1 bg-transparent px-2 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
/>

      <div className="flex h-full items-center px-1.5 text-[9px] font-bold text-slate-400">
  RPM
</div>
    </div>

    <button
      type="button"
      onClick={() => requestCommand('SUBMIT_SPEED_REF')}
      disabled={loadingCommand !== null}
      className="h-9 rounded-lg bg-blue-700 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loadingCommand === 'SUBMIT_SPEED_REF' ? '...' : 'OK'}
    </button>

    <button
      type="button"
      onClick={() => requestCommand('START')}
      disabled={loadingCommand !== null}
      className="h-9 rounded-lg bg-emerald-500 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loadingCommand === 'START' ? '...' : 'START'}
    </button>

    <button
      type="button"
      onClick={() => requestCommand('STOP')}
      disabled={loadingCommand !== null}
      className="h-9 rounded-lg bg-red-600 text-xs font-extrabold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loadingCommand === 'STOP' ? '...' : 'STOP'}
    </button>
  </div>
</article>

      <PinConfirmModal
        open={pendingCommand !== null}
        title="Confirm Pump Command"
        description={`Enter operator PIN to execute ${formatCommand(
          pendingCommand,
        )} for ${name}.`}
        pin={pin}
        error={pinError}
        loading={loadingCommand !== null}
        onPinChange={setPin}
        onCancel={cancelCommand}
        onConfirm={confirmCommand}
      />

      <CommandSuccessModal
        open={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />
    </>
  );
}

function formatCommand(command) {
  if (!command) return '';

  if (command === 'SUBMIT_SPEED_REF') {
    return 'Speed Ref Change';
  }

  return command;
}

function PumpNumber({ number }) {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-400 text-sm font-medium text-white">
        {number}
      </span>
    </div>
  );
}

function PumpVisual({ image }) {
  return (
    <div className="flex h-full items-center justify-center">
      <img
        src={image}
        alt="Pump"
        className="max-h-[52px] w-auto object-contain lg:max-h-[64px] 2xl:max-h-[72px]"
      />
    </div>
  );
}

function PumpIdentity({ name, mode, isAuto }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <h3 className="truncate text-base font-bold leading-none text-slate-950 lg:text-lg">
        {name}
      </h3>

      <div
        className={
          isAuto
            ? 'mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium leading-none text-emerald-600'
            : 'mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium leading-none text-slate-500'
        }
      >
        <span>{mode}</span>

        <span
          className={
            isAuto
              ? 'h-2 w-2 rounded-full bg-emerald-500'
              : 'h-2 w-2 rounded-full bg-slate-300'
          }
        />
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <div className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function formatMetricValue(value, unit) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numberValue = Number(value);

  if (!Number.isNaN(numberValue)) {
    const formattedValue = numberValue.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    });

    return `${formattedValue} ${unit || ''}`.trim();
  }

  return `${value} ${unit || ''}`.trim();
}

function formatRunHour(value) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === '-'
  ) {
    return '-';
  }

  const stringValue = String(value).trim();

  if (stringValue.includes(':')) {
    return stringValue;
  }

  if (stringValue.toLowerCase().includes('h')) {
    return stringValue;
  }

  const numberValue = Number(stringValue);

  if (Number.isNaN(numberValue)) {
    return stringValue;
  }

  return `${numberValue.toLocaleString('id-ID')} h`;
}

function getSuccessMessage(command, pumpName, speedRef) {
  if (command === 'START') {
    return `Pompa ${pumpName} berhasil dijalankan.`;
  }

  if (command === 'STOP') {
    return `Pompa ${pumpName} berhasil dihentikan.`;
  }

  if (command === 'SUBMIT_SPEED_REF') {
    return `Speed ref ${pumpName} berhasil diset ke ${speedRef} RPM.`;
  }

  return 'Command berhasil dieksekusi.';
}