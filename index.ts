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

.post('/print', async ({ body }) => {
    try {
      const buffer = Buffer.from(await body.image.arrayBuffer());
      
      // 1. Manually create the Image object from the buffer
      // This skips the fs.accessSync check that is crashing your app
      const thermalImage = new Image();
      await thermalImage.load(buffer);

      printer.clear();
      printer.alignCenter();
      
      // 2. Pass the processed Image object instead of the raw buffer
      await printer.printImage(thermalImage);
      
      printer.cut();
      await printer.execute();

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
    }
  }, {
    body: t.Object({
      image: t.File()
    })
  })
  .listen(3000);

console.log(`🚀 Printer API active at http://[PI_IP_ADDRESS]:3000`);
