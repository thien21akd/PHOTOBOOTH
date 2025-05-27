const serverConfigged = require("./server.config.js");
const routesConfigged = require("./Source/Routes/routes.js");
const PORT = 3300;
const app = serverConfigged();

routesConfigged(app);
app.listen(PORT, () => {
  console.log("Server đang chạy ở cổng: ", PORT);
});
