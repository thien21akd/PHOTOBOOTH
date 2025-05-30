class PhotoboothController {
  renderView(req, res, next) {
    res.render("photobooth", {
      title: "Photobooth",
      style: "photobooth.css",
      headerStyle: "header.css",
      headerScript: "header.js",
      script: "photobooth.js",
      footerStyle: "footer.css",
    });
  }
}

module.exports = PhotoboothController;
