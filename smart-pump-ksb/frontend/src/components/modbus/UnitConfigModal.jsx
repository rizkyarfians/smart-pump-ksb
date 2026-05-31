import SelectField from './common/SelectField';
import UnitStatusBadge from './common/UnitStatusBadge';
import TabButton from './common/TabButton';

import NetworkTab from './tabs/NetworkTab';
import LiveTab from './tabs/LiveTab';
import RegistersTab from './tabs/RegistersTab';
import CoilsTab from './tabs/CoilsTab';

export default function UnitConfigModal({
  form,
  selectedPump,
  selectedPumpId,
  pumps,
  tags,
  liveRows,
  coilRows,
  activeTab,
  liveLoading,
  loading,
  testResult,
  connectionStatus,
  onTabChange,
  onClose,
  onSelectPump,
  onRefreshLive,
  onTestConnection,
  onSaveConfig,
  onUpdateField,
  onAddRegister,
  onAddCoil,
  onToggleTagEnabled,
  onEditTag,
  onToggleContactType,
}) {
  const lastUpdate = liveRows
    .map((row) => row.updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-6 py-6">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-950">
            Edit Unit Config
          </h2>

          <p className="text-sm font-medium text-slate-500">
            Sinkron ke DB: network, live polling, register, dan coils/alarms.
          </p>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 px-6 pt-4">
          <TabButton
            active={activeTab === 'network'}
            onClick={() => onTabChange('network')}
            label="Network"
          />

          <TabButton
            active={activeTab === 'live'}
            onClick={() => onTabChange('live')}
            label="Live"
          />

          <TabButton
            active={activeTab === 'registers'}
            onClick={() => onTabChange('registers')}
            label="Registers"
          />

          <TabButton
            active={activeTab === 'coils'}
            onClick={() => onTabChange('coils')}
            label="Coils/Alarms"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
            <SelectField
              label="Select Unit"
              value={selectedPumpId}
              onChange={onSelectPump}
              options={pumps.map((pump) => ({
                value: String(pump.id),
                label: `${pump.pump_name} - ${pump.pump_code}`,
              }))}
            />

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-400">
                    Selected Unit
                  </div>

                  <div className="mt-2 text-lg font-bold text-slate-950">
                    {selectedPump?.pump_name || '-'}
                  </div>

                  <div className="text-sm font-semibold text-slate-500">
                    {selectedPump?.pump_code || '-'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <UnitStatusBadge connectionStatus={connectionStatus} />

                  <button
                    type="button"
                    onClick={onRefreshLive}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                  >
                    {liveLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'network' && (
            <NetworkTab
              form={form}
              loading={loading}
              testResult={testResult}
              onUpdateField={onUpdateField}
              onTestConnection={onTestConnection}
              onSaveConfig={onSaveConfig}
            />
          )}

          {activeTab === 'live' && (
            <LiveTab
              form={form}
              liveRows={liveRows}
              lastUpdate={lastUpdate}
            />
          )}

          {activeTab === 'registers' && (
            <RegistersTab
              tags={tags}
              onAddRegister={onAddRegister}
              onEditTag={onEditTag}
              onToggleTagEnabled={onToggleTagEnabled}
            />
          )}

          {activeTab === 'coils' && (
            <CoilsTab
              coilRows={coilRows}
              onAddCoil={onAddCoil}
              onEditTag={onEditTag}
              onToggleTagEnabled={onToggleTagEnabled}
              onToggleContactType={onToggleContactType}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSaveConfig}
            className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}