module.exports = (app) => {
  const brands = require("../controllers/brand.controller.js");
  const auth = require("../controllers/auth.controller.js");
  const router = require("express").Router();

  router.get("/active", brands.findActive);
  router.post("/", auth.verifyToken, brands.create);
  router.get("/", auth.verifyToken, brands.findAll);
  router.get("/:id", auth.verifyToken, brands.findOne);
  router.patch("/:id", auth.verifyToken, brands.update);
  router.delete("/:id", auth.verifyToken, brands.delete);

  app.use("/api/brands", router);
};
