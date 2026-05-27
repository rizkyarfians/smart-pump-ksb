import { useState } from 'react';

import { sendPumpCommand } from '../../services/pumpControl';

import PinConfirmModal from './PinConfirmModal';

import amarexImg from '../../assets/pumps/amarex.png';
import amacanImg from '../../assets/pumps/amacan.png';
import CommandSuccessModal from './CommandSuccessModal';

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

  console.log('PumpControlRow props:', {
  pumpId,
  name,
  runHour,
  power,
  current,
  voltage,
  speedActual,
});
  const [speedRef, setSpeedRef] = useState('');
  const [loadingCommand, setLoadingCommand] = useState(null);

  const [pendingCommand, setPendingCommand] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const isAuto = String(mode).toLowerCase() === 'auto';
  const [successMessage, setSuccessMessage] = useState('');

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

      const result = await sendPumpCommand(payload);

      console.log('Command success:', result);

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
      <article className="grid h-full min-h-0 grid-cols-[48px_96px_170px_minmax(0,1fr)_360px] items-stretch gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-0">
        <PumpNumber number={number} />

        <PumpVisual image={pumpImage} />

        <PumpIdentity
          name={name}
          mode={mode}
          isAuto={isAuto}
        />

        <div className="grid h-full grid-cols-5 items-center gap-4">
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

        <div className="grid h-full grid-cols-[135px_54px_74px_74px] items-center gap-2">
          <div className="flex h-10 min-w-0 items-center overflow-hidden rounded-lg border border-blue-200 bg-blue-50/60 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
            <div className="flex h-full items-center bg-blue-100 px-2 text-[9px] font-bold uppercase tracking-wide text-blue-700">
              REF
            </div>

            <input
              type="number"
              value={speedRef}
              onChange={(e) => setSpeedRef(e.target.value)}
              placeholder="Speed"
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />

            <div className="flex h-full items-center px-2 text-[9px] font-bold text-slate-400">
              RPM
            </div>
          </div>

          <button
            type="button"
            onClick={() => requestCommand('SUBMIT_SPEED_REF')}
            disabled={loadingCommand !== null}
            className="h-10 rounded-lg bg-blue-700 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingCommand === 'SUBMIT_SPEED_REF' ? '...' : 'OK'}
          </button>

          <button
            type="button"
            onClick={() => requestCommand('START')}
            disabled={loadingCommand !== null}
            className="h-10 rounded-lg bg-emerald-500 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingCommand === 'START' ? '...' : 'START'}
          </button>

          <button
            type="button"
            onClick={() => requestCommand('STOP')}
            disabled={loadingCommand !== null}
            className="h-10 rounded-lg bg-red-600 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-400 text-sm font-bold text-white">
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
        className="max-h-[72px] w-auto object-contain"
      />
    </div>
  );
}

function PumpIdentity({ name, mode, isAuto }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center">
      <h3 className="truncate text-lg font-semibold leading-none text-slate-950">
        {name}
      </h3>

      <div
        className={
          isAuto
            ? 'mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold leading-none text-emerald-600'
            : 'mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold leading-none text-slate-500'
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
      <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate text-base font-semibold text-slate-950">
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
  console.log('Formatting run hour:', { value, stringValue, numberValue });

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