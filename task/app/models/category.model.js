// models/category.js
module.exports = (sequelize, Sequelize) => {
    const Category = sequelize.define("category", {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        nameMn: {
            type: Sequelize.STRING,
            field: 'name_mn'
        },
        image: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "default-category.jpg",
        },
        description: {
            type: Sequelize.TEXT
        },
        productCount: {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            field: 'product_count'
        },
        parentId: {
            type: Sequelize.UUID,
            field: 'parent_id',
            references: {
                model: 'categories',
                key: 'id'
            }
        },
        order: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Order for first-level parent categories only'
        }
    }, {
        timestamps: false,
        tableName: 'categories',
        indexes: [
            {
                fields: ['parent_id']
            }
        ]
    });

    return Category;
};