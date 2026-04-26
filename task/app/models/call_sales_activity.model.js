module.exports = (sequelize, Sequelize) => {
  const CallSalesActivity = sequelize.define("call_sales_activity", {
    // 1️⃣ Үндсэн мэдээлэл
    sales_manager_id: {
      type: Sequelize.UUID,
      allowNull: false,
      comment: "Ямар борлуулалтын менежер залгасан"
    },
    customer_id: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: "Харилцагч (байгаа бол)"
    },
    customer_name: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Харилцагчийн нэр (шинэ бол)"
    },
    phone_number: {
      type: Sequelize.STRING,
      allowNull: false,
      comment: "Залгасан дугаар"
    },

    // 2️⃣ Залгалтын мэдээлэл
    // Use STRING instead of ENUM: Sequelize sync(alter) builds invalid SQL for PG ENUM + COMMENT (USING glued to COMMENT).
    call_type: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "outgoing",
      validate: { isIn: [["outgoing", "incoming"]] },
      comment: "outgoing / incoming"
    },
    call_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: "Залгасан огноо"
    },
    call_time: {
      type: Sequelize.TIME,
      allowNull: true,
      comment: "Залгасан цаг"
    },
    call_duration_sec: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Үргэлжилсэн хугацаа (секунд)"
    },
    call_result: {
      type: Sequelize.STRING(20),
      allowNull: true,
      validate: { isIn: [["answered", "no_answer", "busy", "rejected"]] },
      comment: "answered / no_answer / busy / rejected"
    },

    // 3️⃣ Борлуулалтын үр дүн
    interest_level: {
      type: Sequelize.STRING(20),
      allowNull: true,
      validate: { isIn: [["high", "medium", "low"]] },
      comment: "high / medium / low"
    },
    sale_status: {
      type: Sequelize.STRING(30),
      allowNull: true,
      validate: { isIn: [["sold", "follow_up", "not_interested"]] },
      comment: "sold / follow_up / not_interested"
    },
    product: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "POS цаасны төрөл (57mm, 80mm гэх мэт)"
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Тоо ширхэг"
    },
    price_offer: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: "Санал болгосон үнэ"
    },
    sale_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: "Борлуулалтын дүн"
    },
    order_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Захиалга болсон бол"
    },

    // 4️⃣ Follow-up (маш чухал)
    next_call_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: "Дараагийн залгалт хийх огноо"
    },
    next_action: {
      type: Sequelize.STRING(30),
      allowNull: true,
      validate: { isIn: [["call_back", "send_price", "meeting"]] },
      comment: "call_back / send_price / meeting"
    },
    follow_up_status: {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: "pending",
      validate: { isIn: [["pending", "done"]] },
      comment: "pending / done"
    },

    // 5️⃣ Тэмдэглэл
    note: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Ярьсан зүйл, нөхцөл"
    }
  }, {
    tableName: 'call_sales_activities',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CallSalesActivity;
};

