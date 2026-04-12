module.exports = app => {
  const orders = require("../controllers/order.controller.js");
  const auth = require("../controllers/auth.controller.js");

  var router = require("express").Router();

  // Create a new Order
  router.post("/", orders.create);

  // Retrieve all Orders by user ID (requires authentication)
  router.get("/", auth.verifyToken, orders.findAllByUserId);

  // Get last delivered order (requires authentication)
  router.get("/last-delivered", auth.verifyToken, orders.getLastDeliveredOrder);

  // Get all orders (admin) — must be before /:id so "admin" is not captured as an id
  router.get("/admin/all", orders.findAll);

  // Retrieve Order by order number (before /:id)
  router.get("/number/:orderNumber", orders.findByOrderNumber);

  // Retrieve a single Order with id
  router.get("/:id", orders.findOne);

  // Update an Order with id
  router.patch("/:id", orders.update);

  // Delete an Order with id
  router.delete("/:id", orders.delete);

  // Update order status
  router.patch("/:id/status", orders.updateStatus);

  // Update payment status
  router.patch("/:id/payment", orders.updatePaymentStatus);

  // Create invoice (update order with invoice/shipping data)
  router.post("/:orderId/invoice", orders.createInvoice);

  // Generate invoice PDF
  router.get("/:id/invoice/pdf", orders.generateInvoicePDF);

  app.use('/api/order', router);
};