const express = require("express");
const exphbs = require("express-handlebars");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");

const configServer = () => {
  // Cấu hình middleware xử lý về template engine handlebars
  app.engine(
    "hbs",
    exphbs.engine({
      extname: "hbs",
      defaultLayout: "main",
      layoutsDir: path.join(__dirname, "Source", "Views", "Layouts"),
      partialsDir: path.join(__dirname, "Source", "Views", "Partials"),
    })
  );
  app.set("views", path.join(__dirname, "Source", "Views"));
  app.set("view engine", "hbs");

  // Cấu hình middleware xử lý các file static như img, css và js
  app.use(express.static(path.join(__dirname, "Source", "Public", "Image")));
  app.use(express.static(path.join(__dirname, "Source", "Public", "Css")));
  app.use(express.static(path.join(__dirname, "Source", "Public", "Js")));


  // Available for all files in public
  // app.use(express.static(path.join(__dirname, "Source", "Public")));
  // Cấu hình middleware xử lý các type data gửi về từ client
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  return app;
};

module.exports = configServer;
