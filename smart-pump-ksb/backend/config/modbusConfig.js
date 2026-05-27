const modbusConfig = {
  host: '127.0.0.1',
  port: 502,
  unitId: 1,
  timeout: 3000,
  reconnectInterval: 5000,
  pollingInterval: 1000,

  registers: [
    {
      id: 1,
      pumpId: 1,
      name: 'Pump 1 Speed',
      type: 'holdingRegister',
      address: 40001,
      quantity: 1,
      dataType: 'uint16',
      scale: 1,
      unit: 'RPM',
      writable: true,
    },
    {
      id: 2,
      pumpId: 1,
      name: 'Pump 1 Current',
      type: 'holdingRegister',
      address: 40002,
      quantity: 1,
      dataType: 'uint16',
      scale: 0.1,
      unit: 'A',
      writable: false,
    },
  ],
};


module.exports = modbusConfig;