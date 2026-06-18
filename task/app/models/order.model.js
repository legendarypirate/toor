module.exports = (sequelize, Sequelize) => {
    const Order = sequelize.define("orders", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        order_number: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true
        },
        user_id: {
            type: Sequelize.STRING(100),
            allowNull: false,
            comment: "User ID from frontend (can be guest ID)"
        },
        subtotal: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        shipping_cost: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        tax: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        grand_total: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        payment_method: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0: QPay, 1: Cash, 2: Card, 3: SocialPay"
        },
        payment_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0: Pending, 1: Paid, 2: Failed, 3: Refunded"
        },
        order_status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "0: Processing, 1: Shipped, 2: Delivered, 3: Cancelled"
        },
        shipping_address: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        district: {
            type: Sequelize.STRING(100),
            allowNull: true,
            comment: "Дүүрэг (District)"
        },
        khoroo: {
            type: Sequelize.STRING(100),
            allowNull: true,
            comment: "Хороо (Khoroo)"
        },
        phone_number: {
            type: Sequelize.STRING(50),
            allowNull: false
        },
        customer_name: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        notes: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        invoice_id: {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: "QPay invoice ID"
        },
        qr_image: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: "QPay QR code image URL"
        },
        qr_text: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: "QPay QR code text"
        },
        invoice_data: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: "JSON string containing invoice-specific data (name, register, email, phone)"
        },
        processing_started_at: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: "Timestamp when order status changed to processing (боловсруулж байна)"
        },
        isDeleted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Soft delete flag - true if order is deleted"
        },
        created_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        updated_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        }
    }, {
        timestamps: false,
        tableName: 'orders',
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['order_number']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['created_at']
            },
            {
                fields: ['invoice_id']
            }
        ]
    });

    return Order;
};