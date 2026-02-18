import { Elysia, t } from 'elysia';
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';

// Network configuration for your printer
const PRINTER_IP = '192.168.1.111';

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,      // Most network printers use EPSON (ESC/POS)
  interface: `tcp://${PRINTER_IP}`,
  timeout: 10000,                 // 5 second timeout for network hiccups
  width: 576,                    // Standard 58mm width (use 576 for 80mm)
});

const app = new Elysia()
  // Health check: Verify the printer is reachable on the network
  .get('/status', async () => {
    const isConnected = await printer.isPrinterConnected();
    return { 
      status: isConnected ? 'online' : 'offline',
      ip: PRINTER_IP,
      timestamp: new Date().toISOString()
    };
  })

  .post('/print', async ({ body, set }) => {
    try {
      // Ensure we start with a clean buffer
      printer.clear();
      
      const buffer = Buffer.from(await body.image.arrayBuffer());

      printer.alignCenter();
      await printer.printImage(buffer);
      printer.cut();

      // Execute sends the raw data over the network via TCP
      await printer.execute();
      
      return { success: true, message: `Sent to ${PRINTER_IP}` };
    } catch (error) {
      set.status = 500;
      console.log(error)
      return { success: false, error: 'Network printer error or timeout' };
    }
  }, {
    body: t.Object({
      image: t.File({
        type: 'image',
        maxSize: '2m'
      })
    })
  })
  .listen(3000);

console.log(`🚀 Printer API active at http://[PI_IP_ADDRESS]:3000`);
