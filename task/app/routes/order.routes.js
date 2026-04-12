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

  // Retrieve a single Order with id
  router.get("/:id", orders.findOne);

  // Retrieve Order by order number
  router.get("/number/:orderNumber", orders.findByOrderNumber);

  // Update an Order with id
  router.patch("/:id", orders.update);

  // Delete an Order with id
  router.delete("/:id", orders.delete);

  // Get all orders (admin)
  router.get("/admin/all", orders.findAll);

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