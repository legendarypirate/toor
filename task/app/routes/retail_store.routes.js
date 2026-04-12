module.exports = (app) => {
  const stores = require("../controllers/retail_store.controller.js");
  const auth = require("../controllers/auth.controller.js");
  const router = require("express").Router();

  router.get("/active", stores.findActive);
  router.post("/", auth.verifyToken, stores.create);
  router.get("/", auth.verifyToken, stores.findAll);
  router.get("/:id", auth.verifyToken, stores.findOne);
  router.patch("/:id", auth.verifyToken, stores.update);
  router.delete("/:id", auth.verifyToken, stores.delete);

  app.use("/api/retail-stores", router);
};
