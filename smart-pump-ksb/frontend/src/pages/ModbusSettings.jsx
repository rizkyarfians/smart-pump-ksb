import ConnectionPanel from '../components/modbus/ConnectionPanel';
import PowerUnitsPanel from '../components/modbus/PowerUnitsPanel';
import UnitConfigModal from '../components/modbus/UnitConfigModal';

import AddUnitModal from '../components/modbus/modals/AddUnitModal';
import RenameUnitModal from '../components/modbus/modals/RenameUnitModal';
import PlcTagModal from '../components/modbus/modals/PlcTagModal';
import PinConfirmModal from '../components/dashboard/PinConfirmModal';

import useModbusSettings from '../hooks/useModbusSettings';

export default function ModbusSettings() {
  const modbus = useModbusSettings();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-4 xl:px-8">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Modbus TCP/IP Setting
          </h1>

          <p className="text-sm font-medium text-slate-500">
            Configure communication between backend and pump controller
          </p>
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 items-start gap-5 pb-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <ConnectionPanel
          form={modbus.form}
          loading={modbus.loading}
          visibleConnectionResult={modbus.visibleConnectionResult}
          onUpdateField={modbus.updateField}
          onTestConnection={modbus.testConnection}
          onSaveConfig={modbus.saveConfig}
        />

        <PowerUnitsPanel
          pumps={modbus.pumps}
          tags={modbus.tags}
          form={modbus.form}
          onAddUnit={modbus.openAddUnitModal}
          onEditUnit={modbus.openEditor}
          onRenameUnit={modbus.openRenameUnitModal}
          onDisableUnit={modbus.handleDisableUnit}
          onEnableUnit={modbus.handleEnableUnit}
          onDeleteUnit={modbus.handleDeleteUnit}
          getPumpConnectionStatus={modbus.getPumpConnectionStatus}
        />
      </main>

      {modbus.isEditorOpen && (
        <UnitConfigModal
          form={modbus.form}
          selectedPump={modbus.selectedPump}
          selectedPumpId={modbus.selectedPumpId}
          pumps={modbus.pumps}
          tags={modbus.selectedPumpTags}
          liveRows={modbus.liveRows}
          coilRows={modbus.coilRows}
          activeTab={modbus.activeTab}
          liveLoading={modbus.liveLoading}
          loading={modbus.loading}
          testResult={modbus.visibleConnectionResult}
          connectionStatus={modbus.selectedConnectionStatus}
          onTabChange={modbus.setActiveTab}
          onClose={() => modbus.setIsEditorOpen(false)}
          onSelectPump={modbus.setSelectedPumpId}
          onRefreshLive={modbus.refreshLatestValues}
          onTestConnection={modbus.testConnection}
          onSaveConfig={modbus.saveConfig}
          onUpdateField={modbus.updateField}
          onAddRegister={() => modbus.openAddTagModal('register')}
          onAddCoil={() => modbus.openAddTagModal('coil')}
          onEditTag={modbus.openEditTagModal}
          onToggleTagEnabled={modbus.handleToggleTagEnabled}
        />
      )}

      {modbus.isAddUnitOpen && (
        <AddUnitModal
          value={modbus.newUnit}
          onChange={modbus.setNewUnit}
          loading={modbus.addingUnit}
          onClose={() => modbus.setIsAddUnitOpen(false)}
          onSubmit={modbus.handleAddUnit}
        />
      )}

      {modbus.isRenameUnitOpen && (
        <RenameUnitModal
          value={modbus.editingUnit}
          onChange={modbus.setEditingUnit}
          loading={modbus.savingUnit}
          onClose={() => modbus.setIsRenameUnitOpen(false)}
          onSubmit={modbus.handleRenameUnit}
        />
      )}

      {modbus.isTagModalOpen && (
        <PlcTagModal
          type={modbus.tagModalType}
          mode={modbus.tagModalMode}
          pumps={modbus.pumps}
          value={modbus.newTag}
          onChange={modbus.setNewTag}
          loading={modbus.addingTag}
          onClose={() => modbus.setIsTagModalOpen(false)}
          onSubmit={modbus.openSaveTagPinModal}
        />
      )}

      <PinConfirmModal
        open={Boolean(modbus.pendingSettingAction)}
        title={modbus.pendingSettingAction?.title || 'Confirm Setting Action'}
        description={modbus.pendingSettingAction?.description || ''}
        pin={modbus.settingPin}
        error={modbus.settingPinError}
        loading={modbus.settingPinLoading}
        onPinChange={modbus.setSettingPin}
        onCancel={modbus.cancelSettingAction}
        onConfirm={modbus.confirmSettingAction}
      />
    </div>
  );
}