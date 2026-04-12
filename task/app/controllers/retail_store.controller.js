const db = require("../models");
const RetailStore = db.retail_stores;

exports.create = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).send({ message: "Name is required" });
    }
    const row = await RetailStore.create({
      name: req.body.name,
      address: req.body.address || null,
      phone: req.body.phone || null,
      hours: req.body.hours || null,
      imageUrl: req.body.imageUrl ?? req.body.image_url ?? null,
      sortOrder: req.body.sortOrder ?? req.body.sort_order ?? 0,
      isActive:
        req.body.isActive !== undefined
          ? req.body.isActive
          : req.body.is_active !== undefined
            ? req.body.is_active
            : true,
    });
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error creating store." });
  }
};

exports.findAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.is_active === "true" || req.query.isActive === "true") {
      where.isActive = true;
    }
    const rows = await RetailStore.findAll({
      where,
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
    res.send(rows);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving stores." });
  }
};

exports.findActive = async (req, res) => {
  try {
    const rows = await RetailStore.findAll({
      where: { isActive: true },
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
    res.send(rows);
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving stores." });
  }
};

exports.findOne = async (req, res) => {
  try {
    const row = await RetailStore.findByPk(req.params.id);
    if (!row) {
      return res.status(404).send({ message: "Store not found." });
    }
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = {};
    const map = {
      name: "name",
      address: "address",
      phone: "phone",
      hours: "hours",
      imageUrl: "imageUrl",
      image_url: "imageUrl",
      sortOrder: "sortOrder",
      sort_order: "sortOrder",
      isActive: "isActive",
      is_active: "isActive",
    };
    Object.keys(map).forEach((k) => {
      if (req.body[k] !== undefined) {
        updateData[map[k]] = req.body[k];
      }
    });
    const [n] = await RetailStore.update(updateData, { where: { id } });
    if (!n) {
      return res.status(404).send({ message: `Store id=${id} not found.` });
    }
    res.send(await RetailStore.findByPk(id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const n = await RetailStore.destroy({ where: { id: req.params.id } });
    if (!n) {
      return res.status(404).send({ message: "Store not found." });
    }
    res.send({ message: "Deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
