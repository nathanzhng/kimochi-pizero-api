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
    // 1. Define a temporary file path
    const tempFilePath = `./temp-${Date.now()}.png`;

    try {
      console.log(`📝 Saving temp file: ${tempFilePath}`);
      
      // 2. Save the incoming image to disk using Bun's native writer
      await Bun.write(tempFilePath, await body.image.arrayBuffer());

      // 3. Print the file (Library is happy because it gets a real path)
      printer.clear();
      printer.alignCenter();
      await printer.printImage(tempFilePath); 
      printer.cut();

      // 4. Send to printer
      await printer.execute();
      
      console.log("✅ Print command sent!");
      return { success: true };

    } catch (error) {
      console.error("❌ Print failed:", error);
      set.status = 500;
      return { success: false, error: error.message };

    } finally {
      // 5. Cleanup: Delete the temp file even if printing failed
      // We use a try/catch here so a cleanup error doesn't crash the server
      try {
        await unlink(tempFilePath);
        console.log(`🗑️ Deleted ${tempFilePath}`);
      } catch (e) {
        console.warn("⚠️ Could not delete temp file");
      }
    }
  }, {
    body: t.Object({
      image: t.File()
    })
  })
  
  .listen(3000);

console.log(`🚀 Printer API active at http://[PI_IP_ADDRESS]:3000`);
