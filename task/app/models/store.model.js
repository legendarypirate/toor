// Physical retail locations (Дэлгүүрүүд)
module.exports = (sequelize, Sequelize) => {
  const RetailStore = sequelize.define(
    "retail_store",
    {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      hours: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Opening hours text",
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "image_url",
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        field: "sort_order",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
    },
    {
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "retail_stores",
      underscored: true,
    }
  );

  return RetailStore;
};
