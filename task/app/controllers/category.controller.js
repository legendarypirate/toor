const db = require("../models");
const Category = db.categories;
const Op = db.Sequelize.Op;
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Get the root directory
const rootDir = path.dirname(require.main.filename);

// Define upload directory relative to the project root
const uploadDir = path.join(rootDir, "app", "assets", "category");

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory: ${uploadDir}`);
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, filename);
  },
});

// Optional single file field `image`; text fields go to req.body. Do not use `.any()` +
// fileFilter(false) — that can drop text parts behind some proxies.
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
}).single("image");

function contentType(req) {
  return String(req.headers["content-type"] || "").toLowerCase();
}

function isMultipart(req) {
  return contentType(req).includes("multipart/form-data");
}

/** Normalize text fields (some stacks duplicate fields as arrays). */
function pickFirst(val) {
  if (val == null) return "";
  if (Array.isArray(val)) return String(val[0] ?? "").trim();
  return String(val).trim();
}

function pickCategoryName(req) {
  const b = req.body || {};
  return (
    pickFirst(b.name) ||
    pickFirst(b.nameMn) ||
    pickFirst(b.Name) ||
    pickFirst(b.NAME)
  );
}

function findUploadedImage(req) {
  return req.file || null;
}

const DEFAULT_CATEGORY_IMAGE = "default-category.jpg";

async function createCategoryFromRequest(req, res) {
  const nameTrim = pickCategoryName(req);
  if (!nameTrim) {
    console.warn(
      "category.create: missing name; content-type=%s bodyKeys=%s",
      contentType(req),
      req.body && typeof req.body === "object" ? Object.keys(req.body).join(",") : "(no body)"
    );
    return res.status(400).send({ message: "Name is required!" });
  }

  const uploaded = findUploadedImage(req);
  let imagePath = DEFAULT_CATEGORY_IMAGE;
  if (uploaded && uploaded.filename) {
    imagePath = "/assets/category/" + uploaded.filename;
    console.log(`File uploaded: ${uploaded.filename}, saved to: ${imagePath}`);
  }
  // Sequelize omits `undefined`; DB then gets NULL → notNull violation. Never omit or pass null.
  const image =
    imagePath && String(imagePath).trim() ? String(imagePath).trim() : DEFAULT_CATEGORY_IMAGE;

  let parentId = pickFirst(req.body.parentId) || null;
  if (parentId === "" || parentId === "null" || parentId === "undefined") {
    parentId = null;
  }

  let order = null;
  if (!parentId) {
    const maxOrderCategory = await Category.findOne({
      where: { parentId: null },
      order: [["order", "DESC"]],
      attributes: ["order"],
    });
    order =
      maxOrderCategory && maxOrderCategory.order !== null
        ? maxOrderCategory.order + 1
        : 1;
  }

  const category = {
    name: nameTrim,
    nameMn: nameTrim,
    image,
    description: pickFirst(req.body.description) || "",
    parentId,
    productCount: Number(req.body.productCount) || 0,
    order,
  };

  const data = await Category.create(category);
  res.send(data);
}

// Create and Save a new Category
exports.create = async (req, res) => {
  const run = async (err) => {
    try {
      if (err) {
        console.error("Upload error:", err);
        return res.status(400).send({
          message: err.message || "Image upload failed.",
        });
      }
      await createCategoryFromRequest(req, res);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).send({
        message: error.message || "Some error occurred while creating the Category.",
      });
    }
  };

  // JSON / urlencoded: body already parsed by express middleware — do not run multer (would see empty body).
  if (!isMultipart(req)) {
    return run(null);
  }

  upload(req, res, run);
};

// Helper function to get all child category IDs recursively from a map
const getAllChildCategoryIds = (categoryId, categoryMap) => {
  const childIds = [categoryId];
  const children = categoryMap[categoryId] || [];
  
  for (const childId of children) {
    const grandChildren = getAllChildCategoryIds(childId, categoryMap);
    childIds.push(...grandChildren);
  }
  
  return childIds;
};

// Retrieve all categories
exports.findAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [
        [Category.sequelize.literal('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END'), 'ASC'],
        [Category.sequelize.literal('CASE WHEN parent_id IS NULL THEN "order" ELSE NULL END'), 'ASC'],
        ['name', 'ASC']
      ],
    });

    // Build a map of parent -> children for efficient lookup
    const categoryMap = {};
    categories.forEach(category => {
      if (category.parentId) {
        if (!categoryMap[category.parentId]) {
          categoryMap[category.parentId] = [];
        }
        categoryMap[category.parentId].push(category.id);
      }
    });

    // Get all product counts by categoryId - OPTIMIZED: Use COUNT query instead of loading all products
    const productCountsByCategory = {};
    // Get unique category IDs from categories
    const categoryIds = categories.map(cat => cat.id);
    
    // Use COUNT queries for each category instead of loading all products
    if (categoryIds.length > 0) {
      const countPromises = categoryIds.map(async (catId) => {
        const count = await db.products.count({
          where: { categoryId: catId }
        });
        return { categoryId: catId, count };
      });
      
      const countResults = await Promise.all(countPromises);
      countResults.forEach(({ categoryId, count }) => {
        productCountsByCategory[categoryId] = count;
      });
    }

    // Calculate productCount including child categories for each category
    const categoriesWithCount = categories.map(category => {
      // Get all child category IDs including the category itself
      const allCategoryIds = getAllChildCategoryIds(category.id, categoryMap);
      
      // Sum up product counts from this category and all its children
      const productCount = allCategoryIds.reduce((sum, catId) => {
        return sum + (productCountsByCategory[catId] || 0);
      }, 0);
      
      return {
        ...category.dataValues,
        productCount: productCount
      };
    });

    const buildTree = (items, parentId = null) => {
      const filtered = items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
      
      // Sort by order for parent categories, then by name
      if (parentId === null) {
        filtered.sort((a, b) => {
          if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== null && a.order !== undefined) return -1;
          if (b.order !== null && b.order !== undefined) return 1;
          return a.name.localeCompare(b.name);
        });
      } else {
        // For subcategories, just sort by name
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      return filtered;
    };

    const treeData = buildTree(categoriesWithCount);

    res.send({
      flat: categoriesWithCount,
      tree: treeData,
      total: categoriesWithCount.length,
    });
  } catch (err) {
    console.error("Error retrieving categories:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving categories.",
    });
  }
};

// Find a single Category by id
exports.findOne = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [
        { 
          model: Category, 
          as: "subcategories",
          include: [{ model: Category, as: "subcategories" }] 
        },
        { model: Category, as: "parent" },
        {
          model: db.products,
          as: "products",
          through: { attributes: [] },
          include: [
            {
              model: db.categories,
              as: "categories",
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (category) {
      // Add product count
      const categoryWithCount = {
        ...category.dataValues,
        productCount: category.products ? category.products.length : 0
      };
      res.send(categoryWithCount);
    }
    else {
      res.status(404).send({
        message: `Cannot find Category with id=${req.params.id}.`,
      });
    }
  } catch (err) {
    console.error("Error retrieving category:", err);
    res.status(500).send({
      message: "Error retrieving Category with id=" + req.params.id,
    });
  }
};

// Update a category (with optional new image upload)
exports.update = async (req, res) => {
  const run = async (err) => {
    try {
      if (err) {
        console.error("Image upload error:", err);
        return res.status(400).send({
          message: err.message || "Image upload failed.",
        });
      }

      const id = req.params.id;
      const updates = {};

      const nm = pickCategoryName(req);
      if (nm) {
        updates.name = nm;
        updates.nameMn = nm;
      }

      if (req.body && req.body.description !== undefined) {
        updates.description = pickFirst(req.body.description);
      }

      if (req.body && req.body.parentId !== undefined) {
        let pid = pickFirst(req.body.parentId) || null;
        if (pid === "" || pid === "null" || pid === "undefined") pid = null;
        updates.parentId = pid;
      }

      if (req.body && req.body.productCount !== undefined) {
        updates.productCount = Number(req.body.productCount);
      }

      if (req.body && req.body.order !== undefined) {
        updates.order = req.body.order;
      }

      const uploadFile = findUploadedImage(req);
      if (uploadFile) {
        const oldCategory = await Category.findByPk(id);
        if (oldCategory && oldCategory.image && oldCategory.image !== "default-category.jpg") {
          const oldImagePath = oldCategory.image.replace("/assets/category/", "");
          const oldImageFullPath = path.join(uploadDir, oldImagePath);

          if (fs.existsSync(oldImageFullPath)) {
            fs.unlinkSync(oldImageFullPath);
            console.log(`Deleted old image: ${oldImageFullPath}`);
          }
        }

        updates.image = "/assets/category/" + uploadFile.filename;
        console.log(`Updated image to: ${updates.image}`);
      }

      const [updated] = await Category.update(updates, {
        where: { id: id },
      });

      if (updated) {
        const updatedCategory = await Category.findByPk(id);
        res.send({
          message: "Category was updated successfully.",
          category: updatedCategory,
        });
      } else {
        res.status(404).send({
          message: `Cannot update Category with id=${id}. Maybe not found!`,
        });
      }
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).send({
        message: "Error updating Category with id=" + req.params.id,
      });
    }
  };

  if (!isMultipart(req)) {
    return run(null);
  }

  upload(req, res, run);
};
// Delete category
exports.delete = async (req, res) => {
  try {
    // Get category first to delete associated image
    const category = await Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).send({
        message: `Category with id=${req.params.id} not found.`,
      });
    }

    // Check if category has subcategories
    const subcategories = await Category.count({
      where: { parentId: req.params.id }
    });

    if (subcategories > 0) {
      return res.status(400).send({
        message: "Cannot delete category with subcategories. Please delete subcategories first.",
      });
    }

    // Delete associated image if exists
    if (category.image && category.image !== "default-category.jpg") {
      const imageFilename = category.image.replace('/assets/category/', '');
      const imagePath = path.join(uploadDir, imageFilename);
      
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Deleted image file: ${imagePath}`);
      }
    }

    const deleted = await Category.destroy({
      where: { id: req.params.id },
    });

    if (deleted) {
      res.send({ message: "Category was deleted successfully!" });
    } else {
      res.status(404).send({
        message: `Cannot delete Category with id=${req.params.id}.`,
      });
    }
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).send({
      message: "Could not delete Category with id=" + req.params.id,
    });
  }
};

// Get subcategories
exports.findSubcategories = async (req, res) => {
  try {
    const subcategories = await Category.findAll({
      where: { parentId: req.params.parentId },
      include: [{ model: Category, as: "subcategories" }],
    });

    res.send(subcategories);
  } catch (err) {
    console.error("Error retrieving subcategories:", err);
    res.status(500).send({
      message: err.message || `Error retrieving subcategories`,
    });
  }
};

// Get top-level categories
exports.findTopLevel = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { parentId: null },
      include: [{ model: Category, as: "subcategories" }],
      order: [
        [Category.sequelize.literal('CASE WHEN "order" IS NULL THEN 1 ELSE 0 END'), 'ASC'],
        ['order', 'ASC'],
        ['name', 'ASC']
      ],
    });

    res.send(categories);
  } catch (err) {
    console.error("Error retrieving top-level categories:", err);
    res.status(500).send({
      message: err.message || "Error retrieving top-level categories.",
    });
  }
};

// Search categories by name
exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).send({ message: "Search query is required" });
    }

    const categories = await Category.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { nameMn: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
        ]
      },
      limit: 50,
    });

    res.send(categories);
  } catch (err) {
    console.error("Error searching categories:", err);
    res.status(500).send({
      message: err.message || "Error searching categories",
    });
  }
};

// Update category order (for drag and drop)
exports.updateOrder = async (req, res) => {
  try {
    const { categoryIds } = req.body;
    
    if (!Array.isArray(categoryIds)) {
      return res.status(400).send({ message: "categoryIds must be an array" });
    }

    // Verify all categories are parent categories (first-level only)
    const categories = await Category.findAll({
      where: {
        id: { [Op.in]: categoryIds },
        parentId: null
      }
    });

    if (categories.length !== categoryIds.length) {
      return res.status(400).send({ 
        message: "All categories must be first-level parent categories" 
      });
    }

    // Update order for each category
    const updatePromises = categoryIds.map((categoryId, index) => {
      return Category.update(
        { order: index + 1 },
        { where: { id: categoryId } }
      );
    });

    await Promise.all(updatePromises);

    res.send({ 
      message: "Category order updated successfully",
      order: categoryIds.map((id, index) => ({ id, order: index + 1 }))
    });
  } catch (err) {
    console.error("Error updating category order:", err);
    res.status(500).send({
      message: err.message || "Error updating category order",
    });
  }
};