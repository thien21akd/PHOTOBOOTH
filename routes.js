const path = require("path");
const homeControllerConfigged = require("../Controllers/homeController");
const homeController = new homeControllerConfigged();
const photoboothControllerConfigged = require("../Controllers/photoboothController");
const photoboothController = new photoboothControllerConfigged();

function handleRoutes(app) {
  app.get("/", homeController.renderView);
  app.get("/photobooth", photoboothController.renderView);
  app.get('/QRCODE', (req, res) => {
  res.send('This is where the QR code would be.');
});
}

module.exports = handleRoutes;
