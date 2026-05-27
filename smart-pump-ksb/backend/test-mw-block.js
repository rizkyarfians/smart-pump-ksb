const ModbusRTU = require('modbus-serial');

const HOST = '192.168.1.122';
const PORT = 502;
const UNIT_ID = 1; // kalau kamu pakai 255, ganti 255

const START_ADDRESS = 15;
const QUANTITY = 15;

async function main() {
  const client = new ModbusRTU();

  client.setTimeout(5000);

  try {
    await client.connectTCP(HOST, { port: PORT });
    client.setID(UNIT_ID);

    console.log(`[OK] Connected to ${HOST}:${PORT}, Unit ID ${UNIT_ID}`);
    console.log(`Reading %MW${START_ADDRESS} - %MW${START_ADDRESS + QUANTITY - 1}`);

    const result = await client.readHoldingRegisters(START_ADDRESS, QUANTITY);

    result.data.forEach((value, index) => {
      const mwAddress = START_ADDRESS + index;
      console.log(`%MW${mwAddress}: ${value}`);
    });

    client.close();
  } catch (error) {
    console.error('[ERROR]', error.message);

    try {
      if (client.isOpen) client.close();
    } catch {}
  }
}

main();