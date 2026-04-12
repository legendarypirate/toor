const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Allowed origins
const allowedOrigins = ["http://localhost:3000", "http://localhost:3002","https://label.mn","https://www.label.mn","https://admin.label.mn"];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // allow this origin
    } else {
      callback(new Error("Not allowed by CORS")); // block this origin
    }
  }
};

// Enable CORS
app.use(cors(corsOptions));
// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Serve static files (images) from the 'app/assets' folder
app.use("/assets", express.static(path.join(__dirname, "app", "assets")));

// Import models (Make sure to update the path if necessary)y
const db = require("./app/models");

// Sync database and handle any errors
async function syncDatabase() {
  try {
    // First, fix the supervisor_id column type issue
    await db.fixSupervisorIdColumn();
    
    // Fix the call_sales_activities.order_id column type issue
    await db.fixCallSalesActivityOrderIdColumn();
    
    // Ensure gift_settings table exists
    await db.ensureGiftSettingsTable();
    
    // Ensure partners table exists
    await db.ensurePartnersTable();

    // Ensure CRM tables exist (customers, contacts, deals, etc.)
    await db.ensureCrmTables();
    
    // Then sync the database
    await db.sequelize.sync({ alter: true });
    console.log("Synced db.");
  } catch (err) {
    console.log("Failed to sync db: " + err.message);
  }
}

syncDatabase();

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the application." });
});


// Route imports
require("./app/routes/task.routes")(app);

// Route imports
require("./app/routes/auth.routes")(app);

// Role-related routes
require("./app/routes/role.routes")(app);

// User-related routes
require("./app/routes/user.routes")(app);

require("./app/routes/order.routes")(app);

require('./app/routes/product.routes')(app);
require('./app/routes/category.routes')(app);
require('./app/routes/review.routes')(app);
require('./app/routes/cart.routes')(app);
require('./app/routes/variation.routes')(app);
require('./app/routes/color_option.routes')(app);
require('./app/routes/qpay.routes')(app);
require('./app/routes/product_info_image.routes')(app);
require('./app/routes/bank_account.routes')(app);
require('./app/routes/footer.routes')(app);
require('./app/routes/coupon.routes')(app);
require('./app/routes/banner.routes')(app);
require('./app/routes/complaint.routes')(app);
require('./app/routes/call_sales_activity.routes')(app);
require('./app/routes/gift_setting.routes')(app);
require('./app/routes/partner.routes')(app);
require('./app/routes/brand.routes')(app);
require('./app/routes/retail_store.routes')(app);

// CRM routes
require('./app/routes/crm/dashboard.routes')(app);
require('./app/routes/crm/customer.routes')(app);
require('./app/routes/crm/contact.routes')(app);
require('./app/routes/crm/deal.routes')(app);
require('./app/routes/crm/taskCrm.routes')(app);
require('./app/routes/crm/noteCrm.routes')(app);
require('./app/routes/crm/smsMessage.routes')(app);
require('./app/routes/crm/emailCrm.routes')(app);
require('./app/routes/crm/invoiceCrm.routes')(app);
require('./app/routes/crm/crmProduct.routes')(app);

// Add error handling for undefined routes
app.all('*', (req, res) => {
  res.status(404).json({ message: "Route not found!" });
});

// set port, listen for requests
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
