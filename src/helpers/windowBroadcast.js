const { BrowserWindow } = require("electron");
const { EventEmitter } = require("events");

const broadcastEvents = new EventEmitter();
// A burst of transcription updates can legitimately have several consumers.
broadcastEvents.setMaxListeners(50);

function broadcastToWindows(channel, data) {
  broadcastEvents.emit("broadcast", { channel, data });
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  });
}

function subscribeToBroadcast(listener) {
  broadcastEvents.on("broadcast", listener);
  return () => broadcastEvents.off("broadcast", listener);
}

module.exports = { broadcastToWindows, subscribeToBroadcast };
