const ModbusRTU = require('modbus-serial');

const HOST = '127.0.0.1';
const PORT = 502;
const UNIT_ID = 1;

const START_ADDRESS = 90;
const QUANTITY = 60;

async function main() {
  const client = new ModbusRTU();

  try {
    client.setTimeout(5000);

    await client.connectTCP(HOST, { port: PORT });
    client.setID(UNIT_ID);

    console.log(`[OK] Connected to ${HOST}:${PORT}, Unit ID ${UNIT_ID}`);
    console.log(
      `Scanning HREG protocol ${START_ADDRESS} - ${
        START_ADDRESS + QUANTITY - 1
      }`,
    );

    for (
      let address = START_ADDRESS;
      address < START_ADDRESS + QUANTITY;
      address += 1
    ) {
      try {
        const res = await client.readHoldingRegisters(address, 1);
        console.log(`HREG protocol ${address}:`, res.data);
      } catch (err) {
        console.log(`HREG protocol ${address}: ERROR - ${err.message}`);
      }
    }

    client.close();
  } catch (error) {
    console.error('[ERROR]', error.message);

    try {
      if (client.isOpen) {
        client.close();
      }
    } catch {}
  }
}

main();