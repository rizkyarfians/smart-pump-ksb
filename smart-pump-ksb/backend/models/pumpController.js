const allowedCommands = ['START', 'STOP', 'SUBMIT_SPEED_REF'];

exports.sendPumpCommand = async (req, res) => {
  try {
    const {
      pumpId,
      pumpName,
      command,
      speedRef,
      operatorPin,
      timestamp,
    } = req.body;

    if (!pumpId || !pumpName || !command || !operatorPin) {
      return res.status(400).json({
        success: false,
        message: 'Missing required command data',
      });
    }

    if (!allowedCommands.includes(command)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid command',
      });
    }

    if (command === 'SUBMIT_SPEED_REF') {
      if (speedRef === '' || speedRef === null || speedRef === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Speed ref is required',
        });
      }

      const speedNumber = Number(speedRef);

      if (Number.isNaN(speedNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Speed ref must be a number',
        });
      }

      if (speedNumber < 0 || speedNumber > 3000) {
        return res.status(400).json({
          success: false,
          message: 'Speed ref must be between 0 and 3000 RPM',
        });
      }
    }

    const validPin = operatorPin === process.env.OPERATOR_PIN;

    if (!validPin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid operator PIN',
      });
    }

    const commandPayload = {
      pumpId,
      pumpName,
      command,
      speedRef: speedRef || null,
      timestamp: timestamp || new Date().toISOString(),
      status: 'APPROVED',
    };

    console.log('Pump command approved:', commandPayload);

    /**
     * Nanti bagian ini bisa diganti:
     * - kirim ke PLC
     * - kirim via MQTT
     * - kirim via Modbus
     * - simpan ke database
     */

    return res.status(200).json({
      success: true,
      message: 'Command approved successfully',
      data: commandPayload,
    });
  } catch (error) {
    console.error('Pump command error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};