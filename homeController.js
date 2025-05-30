class HomeController {
  renderView(req, res, next) {
    res.render("home", {
      title: "Trang chủ",
      style: "home.css",
      headerStyle: "header.css",
      headerScript: "header.js",
      script: "home.js",
      footerStyle: "footer.css",
    });
  }
  renderQR(req, res, next) {
    res.render("QRCODE"
    );
  }
}

module.exports = HomeController;
