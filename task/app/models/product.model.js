// models/product.js
module.exports = (sequelize, Sequelize) => {
    const Product = sequelize.define("product", {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
       
        price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false
        },
        // CRITICAL FIX: Make categoryId allowNull: true since category is required instead
        categoryId: {
            type: Sequelize.UUID,
            allowNull: true, // This is important!
            references: {
                model: 'categories',
                key: 'id'
            },
            field: 'category_id'
        },
        originalPrice: {
            type: Sequelize.DECIMAL(10, 2),
            field: 'original_price'
        },
        images: {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: []
        },
        thumbnail: {
            type: Sequelize.STRING,
            allowNull: false
        },
        // CRITICAL: This should be required, not categoryId (for backward compatibility)
        category: {
            type: Sequelize.STRING,
            allowNull: true
        },
        subcategory: {
            type: Sequelize.STRING
        },
        inStock: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            field: 'in_stock'
        },
        stockQuantity: {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            field: 'stock_quantity'
        },
        sku: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        brand: {
            type: Sequelize.STRING
        },
        retailStoreId: {
            type: Sequelize.UUID,
            allowNull: true,
            field: "retail_store_id",
        },
        description: {
            type: Sequelize.TEXT
        },
       
        specifications: {
            type: Sequelize.JSON,
            defaultValue: {}
        },
        isFeatured: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            field: 'is_featured'
        },
        isNew: {
            type: Sequelize.BOOLEAN,
            defaultValue: true, // Changed to true (default new products are new)
            field: 'is_new'
        },
        isOnSale: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            field: 'is_on_sale'
        },
        isBestSeller: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            field: 'is_best_seller'
        },
        isLimited: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            field: 'is_limited'
        },
        isGift: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            field: 'is_gift'
        },
        giftFloorLimit: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: null,
            field: 'gift_floor_limit',
            comment: 'Minimum cart total amount (in MNT) required to qualify for this gift product'
        },
        discount: {
            type: Sequelize.DECIMAL(5, 2),
            defaultValue: 0
        },
        discountAmount: {
            type: Sequelize.DECIMAL(10, 2),
            field: 'discount_amount'
        },
        salePrice: {
            type: Sequelize.DECIMAL(10, 2),
            field: 'sale_price'
        },
        saleEndDate: {
            type: Sequelize.DATE,
            field: 'sale_end_date'
        },
        sales: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        },
        rating: {
            type: Sequelize.DECIMAL(3, 2),
            defaultValue: 0
        },
        reviewCount: {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            field: 'review_count'
        },
        slug: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        metaTitle: {
            type: Sequelize.STRING,
            field: 'meta_title'
        },
        metaDescription: {
            type: Sequelize.TEXT,
            field: 'meta_description'
        },
        tags: {
            type: Sequelize.JSON,
            defaultValue: []
        },
        weight: {
            type: Sequelize.DECIMAL(10, 2)
        },
        dimensions: {
            type: Sequelize.JSON
        },
        createdAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
            field: 'created_at'
        },
        updatedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
            field: 'updated_at'
        },
        publishedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
            field: 'published_at'
        },
        // Which partner/company this product belongs to (affects bank account shown on checkout)
        company: {
            type: Sequelize.STRING(50),
            allowNull: true,
            defaultValue: 'terguun_gereg'
        },
        bankAccountId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: 'bank_account_id'
        }
    }, {
        timestamps: false,
        tableName: 'products',
        indexes: [
            {
                unique: true,
                fields: ['sku']
            },
            {
                unique: true,
                fields: ['slug']
            },
            {
                fields: ['category']
            },
            {
                fields: ['category_id'] // Add index for categoryId
            },
            {
                fields: ['is_on_sale']
            },
            {
                fields: ['is_featured']
            },
            {
                fields: ['is_new']
            }
        ]
    });

    // Associations are defined in models/index.js
    // This associate function is kept for compatibility but associations
    // should be defined in the main index.js file to avoid conflicts
    Product.associate = function(models) {
        // Only define associations if they don't already exist
        if (!Product.associations.categoryInfo) {
            Product.belongsTo(models.categories, {
                foreignKey: 'category_id',
                as: 'categoryInfo'
            });
        }
        if (!Product.associations.colorOptions) {
            Product.hasMany(models.color_options, {
                foreignKey: 'productId',
                as: 'colorOptions'
            });
        }
    };

    return Product;
};