const db = require("../models");
const Product = db.products;
const Op = db.Sequelize.Op;
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const sequelize = db.sequelize; // Add this line

// Create and Save a new Product
exports.create = async (req, res) => {
  try {
    // Validate request - update to check for either category or categoryId
    if (!req.body.name || !req.body.price || !req.body.sku || !req.body.slug) {
      return res.status(400).send({
        message: "Name, price, SKU, and slug are required!"
      });
    }

    // Check if we have either category or categoryId
    if (!req.body.category && !req.body.categoryId) {
      return res.status(400).send({
        message: "Category (or categoryId) is required!"
      });
    }

    // Validate images - reject blob URLs
    if (req.body.images && Array.isArray(req.body.images)) {
      const hasBlobUrls = req.body.images.some(img => img.startsWith('blob:'));
      if (hasBlobUrls) {
        return res.status(400).send({
          message: "Invalid image URLs detected. Please upload images to Cloudinary first."
        });
      }
    }

    // Generate slug if not provided
    const slug = req.body.slug || generateSlug(req.body.name);
    
    // Check if slug already exists
    const existingProduct = await Product.findOne({ where: { slug } });
    if (existingProduct) {
      return res.status(400).send({
        message: "Slug already exists! Please use a different slug."
      });
    }

    // ===========================
    // CATEGORY LOGIC - SIMPLIFIED
    // ===========================
    let finalCategory = null;
    let finalCategoryId = null;

    // Priority 1: Use categoryId if provided (new system)
    if (req.body.categoryId) {
      // Check if category exists
      const category = await db.categories.findByPk(req.body.categoryId);
      if (!category) {
        return res.status(400).send({
          message: `Category with id=${req.body.categoryId} not found.`
        });
      }
      finalCategoryId = req.body.categoryId;
      finalCategory = category.nameMn || category.name;
    }
    // Priority 2: Use category string (legacy support)
    else if (req.body.category) {
      finalCategory = req.body.category;
      // Try to find matching category by name
      const foundCategory = await db.categories.findOne({
        where: {
          [Op.or]: [
            { name: req.body.category },
            { nameMn: req.body.category }
          ]
        }
      });
      if (foundCategory) {
        finalCategoryId = foundCategory.id;
      }
      // If no matching category found, just use the string (legacy behavior)
    }

    // Create a Product with all required fields
    const product = {
      name: req.body.name,
      nameMn: req.body.nameMn || req.body.name,
      price: req.body.price,
      originalPrice: req.body.originalPrice || req.body.price,
      images: req.body.images || [],
      thumbnail: req.body.thumbnail || (req.body.images && req.body.images[0]) || "default.jpg",
      category: finalCategory, // Always store the category name
      categoryId: finalCategoryId, // Store category ID if we found one
      subcategory: req.body.subcategory || "",
      inStock: req.body.inStock !== undefined ? req.body.inStock : true,
      stockQuantity: req.body.stockQuantity || 0,
      sku: req.body.sku,
      brand: req.body.brand || "",
      description: req.body.description || "",
      descriptionMn: req.body.descriptionMn || req.body.description || "",
      specifications: req.body.specifications || {},
      isFeatured: req.body.isFeatured || false,
      isNew: req.body.isNew !== undefined ? req.body.isNew : true,
      isOnSale: req.body.isOnSale || false,
      isBestSeller: req.body.isBestSeller || false,
      isLimited: req.body.isLimited || false,
      isGift: req.body.isGift || req.body.is_gift || false,
      giftFloorLimit: req.body.giftFloorLimit !== undefined ? req.body.giftFloorLimit : (req.body.gift_floor_limit !== undefined ? req.body.gift_floor_limit : null),
      discount: req.body.discount || 0,
      discountAmount: req.body.discountAmount,
      salePrice: req.body.salePrice || req.body.price,
      saleEndDate: req.body.saleEndDate,
      sales: req.body.sales || 0,
      rating: req.body.rating || 0,
      reviewCount: req.body.reviewCount || 0,
      slug: slug,
      metaTitle: req.body.metaTitle || req.body.name,
      metaDescription: req.body.metaDescription || req.body.description,
      tags: req.body.tags || [],
      weight: req.body.weight,
      dimensions: req.body.dimensions,
      publishedAt: req.body.publishedAt || new Date(),
      // Partner/company selection (affects checkout bank accounts)
      company: req.body.company || 'terguun_gereg',
      bankAccountId:
        req.body.bankAccountId !== undefined
          ? req.body.bankAccountId
          : (req.body.bank_account_id !== undefined ? req.body.bank_account_id : null)
    };

    console.log('Creating product with:', {
      category: product.category,
      categoryId: product.categoryId
    });

    // Save Product in the database
    const createdProduct = await Product.create(product);
    
    // ===========================
    // UPDATE CATEGORY PRODUCT COUNT
    // ===========================
    if (finalCategoryId) {
      await db.categories.increment('productCount', {
        where: { id: finalCategoryId }
      });
    }
    
    // Create variations if provided
    if (req.body.variations && req.body.variations.length > 0) {
      await Promise.all(req.body.variations.map(variation => {
        // Validate variation images
        let variationImages = [];
        if (variation.images && Array.isArray(variation.images)) {
          variationImages = variation.images.filter(img => !img.startsWith('blob:'));
        }
        
        return db.product_variations.create({
          name: variation.name || `Variant ${Date.now()}`,
          nameMn: variation.nameMn || variation.name || `Вариант ${Date.now()}`,
          price: variation.price || req.body.price,
          originalPrice: variation.originalPrice || variation.price || req.body.price,
          sku: variation.sku || `${req.body.sku}-${Date.now()}`,
          images: variationImages,
          inStock: variation.inStock !== undefined ? variation.inStock : true,
          stockQuantity: variation.stockQuantity || 0,
          attributes: variation.attributes || {},
          productId: createdProduct.id
        });
      }));
    }

    // Create color options if provided
    if (req.body.colorOptions && req.body.colorOptions.length > 0) {
      await Promise.all(req.body.colorOptions.map(colorOption => {
        return db.color_options.create({
          name: colorOption.name,
          nameMn: colorOption.nameMn || colorOption.name,
          value: colorOption.value || "#000000",
          image: colorOption.image,
          productId: createdProduct.id
        });
      }));
    }

    // Fetch the complete product with relationships
    const productWithRelations = await Product.findByPk(createdProduct.id, {
      include: [
        { model: db.product_variations, as: 'variations' },
        { model: db.color_options, as: 'colorOptions' },
        // Always try to include category info if we have categoryId
        ...(finalCategoryId ? [
          { 
            model: db.categories, 
            as: 'categoryInfo',
            attributes: ['id', 'name', 'nameMn', 'image', 'productCount']
          }
        ] : [])
      ]
    });

    res.status(201).send(productWithRelations);
  } catch (err) {
    console.error('Error creating product:', err);
    
    // Handle specific Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map(error => ({
        field: error.path,
        message: error.message
      }));
      return res.status(400).send({
        message: "Validation error",
        errors: errors
      });
    }
    
    // Handle unique constraint errors
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send({
        message: "Duplicate entry",
        field: err.errors[0]?.path,
        value: err.errors[0]?.value
      });
    }
    
    res.status(500).send({
      message: err.message || "Some error occurred while creating the Product."
    });
  }
};
// Helper function to generate slug
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
// Helper function to get all child category IDs including the category itself
const getAllChildCategoryIds = (categoryId, categoryMap) => {
  const childIds = [categoryId];
  const children = categoryMap[categoryId] || [];
  for (const childId of children) {
    const grandChildren = getAllChildCategoryIds(childId, categoryMap);
    childIds.push(...grandChildren);
  }
  return childIds;
};

// Helper function to build category map and get all category IDs for filtering
const getCategoryIdsForFiltering = async (categoryId) => {
  // Build category map to get all child categories
  const allCategories = await db.categories.findAll({ raw: true });
  const categoryMap = {};
  allCategories.forEach(cat => {
    if (cat.parentId) {
      if (!categoryMap[cat.parentId]) {
        categoryMap[cat.parentId] = [];
      }
      categoryMap[cat.parentId].push(cat.id);
    }
  });
  
  return getAllChildCategoryIds(categoryId, categoryMap);
};

// Retrieve all Products from the database
exports.findAll = async (req, res) => {
  try {
    const { 
      category, categoryId, subcategory, minPrice, maxPrice, brand, 
      retailStoreId, retail_store_id,
      inStock, isOnSale, isNew, isFeatured, isBestSeller, rating, search, q, sortBy, 
      page = 1, limit = 10, includeVariations = 'true'
    } = req.query;
    
    // Support both 'q' and 'search' query parameters
    const searchTerm = search || q;
    
    const offset = (page - 1) * limit;
    const where = {};

    // Build filter conditions
    // Priority: categoryId > category (for backward compatibility)
    if (categoryId) {
      // Get all child category IDs including the category itself
      const category = await db.categories.findByPk(categoryId);
      if (category) {
        const allCategoryIds = await getCategoryIdsForFiltering(categoryId);
        where.categoryId = { [Op.in]: allCategoryIds };
      } else {
        // Category not found, return empty results
        where.categoryId = { [Op.in]: [] };
      }
    } else if (category) {
      // Legacy support: filter by category name
      // Try to find category by name first
      const foundCategory = await db.categories.findOne({
        where: {
          [Op.or]: [
            { name: category },
            { nameMn: category }
          ]
        }
      });
      
      if (foundCategory) {
        // Use categoryId if found
        const allCategoryIds = await getCategoryIdsForFiltering(foundCategory.id);
        where.categoryId = { [Op.in]: allCategoryIds };
      } else {
        // Fallback to category name matching (legacy)
        where.category = category;
      }
    }
    
    if (subcategory) where.subcategory = subcategory;
    if (inStock !== undefined) where.inStock = inStock === 'true';
    if (isOnSale !== undefined) where.isOnSale = isOnSale === 'true';
    if (isNew !== undefined) where.isNew = isNew === 'true';
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
    if (isBestSeller !== undefined) where.isBestSeller = isBestSeller === 'true';
    if (brand) {
      const parts = String(brand)
        .split(",")
        .map((s) => decodeURIComponent(s.trim()))
        .filter(Boolean);
      if (parts.length === 1) where.brand = parts[0];
      else if (parts.length > 1) where.brand = { [Op.in]: parts };
    }

    const storeParam = retailStoreId || retail_store_id;
    if (storeParam) {
      const parts = String(storeParam)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length === 1) where.retailStoreId = parts[0];
      else if (parts.length > 1) where.retailStoreId = { [Op.in]: parts };
    }
    
    // Price range filter
    const priceConditions = {};
    if (minPrice) priceConditions[Op.gte] = parseFloat(minPrice);
    if (maxPrice) priceConditions[Op.lte] = parseFloat(maxPrice);
    if (Object.keys(priceConditions).length > 0) {
      where.price = priceConditions;
    }
    
    // Rating filter
    if (rating) where.rating = { [Op.gte]: parseFloat(rating) };
    
    // Search filter - search name, description, sku, and brand fields
    // IMPORTANT: Ensure name search works by placing it first and using proper operators
    // NOTE: ILIKE with leading wildcards (%text%) cannot use indexes efficiently
    // For better performance on large datasets, consider:
    // 1. Adding GIN indexes for full-text search: CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('english', name));
    // 2. Using PostgreSQL's full-text search instead of ILIKE
    // 3. Limiting search to indexed columns only
    if (searchTerm) {
      // Build search conditions array
      // Use Op.or to search across multiple fields
      // Note: Op.iLike is case-insensitive, so it should work for name search
      // NOTE: Only search columns that exist in the products table (nameMn doesn't exist)
      // IMPORTANT: Products table does NOT have nameMn column - only name, description, sku, brand
      const searchConditions = [
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } },
        { sku: { [Op.iLike]: `%${searchTerm}%` } },
        { brand: { [Op.iLike]: `%${searchTerm}%` } }
      ];
      
      // CRITICAL: Ensure nameMn is NEVER included in search conditions
      // Filter out any accidental nameMn references
      const filteredConditions = searchConditions.filter(condition => {
        const keys = Object.keys(condition);
        return !keys.includes('nameMn') && !keys.some(k => k.toLowerCase().includes('namemn'));
      });
      
      // Sequelize automatically combines root-level conditions with AND
      // and Op.or creates an OR group, so this becomes:
      // WHERE (other conditions) AND (name ILIKE ... OR description ILIKE ... OR ...)
      where[Op.or] = filteredConditions;
    }
    
    // CRITICAL SAFEGUARD: Remove any nameMn references from where clause
    // This prevents errors if nameMn somehow gets added elsewhere
    if (where[Op.or] && Array.isArray(where[Op.or])) {
      where[Op.or] = where[Op.or].filter(condition => {
        if (typeof condition === 'object' && condition !== null) {
          const keys = Object.keys(condition);
          return !keys.includes('nameMn') && !keys.some(k => k.toLowerCase().includes('namemn'));
        }
        return true;
      });
    }

    // Build order
    let order = [['createdAt', 'DESC']];
    if (sortBy) {
      switch (sortBy) {
        case 'price':
        case 'price_asc': 
          order = [['price', 'ASC']]; 
          break;
        case 'price_desc': 
          order = [['price', 'DESC']]; 
          break;
        case 'createdAt':
        case 'newest': 
          order = [['createdAt', 'DESC']]; 
          break;
        case 'updatedAt': 
          order = [['updatedAt', 'DESC']]; 
          break;
        case 'rating': 
          order = [['rating', 'DESC']]; 
          break;
        case 'popularity': 
          order = [['sales', 'DESC']]; 
          break;
        case 'discount': 
          order = [[sequelize.literal('(originalPrice - price)'), 'DESC']];
          break;
        case 'name_asc': 
          order = [['name', 'ASC']]; 
          break;
        case 'name_desc': 
          order = [['name', 'DESC']]; 
          break;
      }
    }

    // Include options
    const include = [];
    
    // Include variations if requested
    if (includeVariations === 'true') {
      include.push({
        model: db.product_variations,
        as: 'variations',
        attributes: ['id', 'name', 'nameMn', 'price', 'originalPrice', 'sku', 
                    'inStock', 'stockQuantity', 'attributes', 'images', 'thumbnail'],
        required: false
      });
    }

    // Get price statistics for FILTERED products
    // OPTIMIZED: Use ORDER BY with LIMIT instead of MIN/MAX aggregation to prevent memory issues
    // This approach is more memory-efficient because:
    // 1. It can stop after finding the first result (LIMIT 1)
    // 2. It doesn't need to keep all matching rows in memory
    // 3. PostgreSQL can use an index on the price column if available
    // RECOMMENDATION: Add index on price column for better performance:
    // CREATE INDEX idx_products_price ON products(price);
    
    // Helper function to recursively remove empty objects and arrays
    // This prevents Sequelize "Invalid value {}" errors
    const cleanEmptyValues = (obj) => {
      if (Array.isArray(obj)) {
        return obj.filter(item => {
          if (typeof item === 'object' && item !== null) {
            const cleaned = cleanEmptyValues(item);
            return Object.keys(cleaned).length > 0;
          }
          return true;
        });
      }
      if (typeof obj === 'object' && obj !== null) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value === null || value === undefined) continue;
          if (typeof value === 'object') {
            const cleanedValue = cleanEmptyValues(value);
            // Skip empty objects and empty arrays
            if (Array.isArray(cleanedValue) && cleanedValue.length === 0) continue;
            if (!Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0) continue;
            cleaned[key] = cleanedValue;
          } else {
            cleaned[key] = value;
          }
        }
        return cleaned;
      }
      return obj;
    };
    
    let filteredPriceStats = null;
    try {
      // CRITICAL: Create a clean where clause without any nameMn references
      // This prevents "column product.nameMn does not exist" errors
      const cleanWhere = JSON.parse(JSON.stringify(where)); // Deep clone
      if (cleanWhere[Op.or] && Array.isArray(cleanWhere[Op.or])) {
        cleanWhere[Op.or] = cleanWhere[Op.or].filter(condition => {
          if (typeof condition === 'object' && condition !== null) {
            const keys = Object.keys(condition);
            // Remove empty objects
            if (keys.length === 0) return false;
            return !keys.includes('nameMn') && !keys.some(k => k.toLowerCase().includes('namemn'));
          }
          return true;
        });
        // Remove Op.or if array becomes empty
        if (cleanWhere[Op.or].length === 0) {
          delete cleanWhere[Op.or];
        }
      }
      
      // Clean the where clause to remove any empty objects
      const finalCleanWhere = cleanEmptyValues(cleanWhere);
      
      // For search queries with ILIKE, use a more efficient approach
      // Instead of scanning all rows, we'll use ORDER BY with LIMIT
      if (searchTerm && finalCleanWhere[Op.or]) {
        // Use separate queries for min and max to avoid memory issues
        const minPriceResult = await Product.findOne({
          attributes: ['price'],
          where: finalCleanWhere,
          order: [['price', 'ASC']],
          limit: 1,
          raw: true
        });
        
        const maxPriceResult = await Product.findOne({
          attributes: ['price'],
          where: finalCleanWhere,
          order: [['price', 'DESC']],
          limit: 1,
          raw: true
        });
        
        filteredPriceStats = {
          dataValues: {
            minPrice: minPriceResult?.price || 0,
            maxPrice: maxPriceResult?.price || 5000000
          }
        };
      } else {
        // For non-search queries, use aggregation (more efficient when no ILIKE)
        filteredPriceStats = await Product.findOne({
          attributes: [
            [sequelize.fn('MIN', sequelize.col('price')), 'minPrice'],
            [sequelize.fn('MAX', sequelize.col('price')), 'maxPrice']
          ],
          where: finalCleanWhere
        });
      }
    } catch (statsError) {
      console.error('Error calculating price stats:', statsError);
      // Check if error is related to nameMn column or empty objects
      if (statsError.message && (statsError.message.includes('nameMn') || statsError.message.includes('Invalid value'))) {
        console.error('CRITICAL: Error in price stats query:', statsError.message);
        // Try again with a completely clean where clause (no search, no empty objects)
        try {
          const fallbackWhere = { ...where };
          delete fallbackWhere[Op.or];
          
          // Clean empty objects from fallback where clause
          const cleanedFallbackWhere = cleanEmptyValues(fallbackWhere);
          
          filteredPriceStats = await Product.findOne({
            attributes: [
              [sequelize.fn('MIN', sequelize.col('price')), 'minPrice'],
              [sequelize.fn('MAX', sequelize.col('price')), 'maxPrice']
            ],
            where: cleanedFallbackWhere
          });
        } catch (fallbackError) {
          console.error('Fallback price stats query also failed:', fallbackError);
        }
      }
      // Fallback to default values if stats query fails
      if (!filteredPriceStats) {
        filteredPriceStats = {
          dataValues: {
            minPrice: 0,
            maxPrice: 5000000
          }
        };
      }
    }

    // Get total count separately (without includes) to ensure accurate count
    const totalCount = await Product.count({
      where
    });

    // Get products with includes
    const rows = await Product.findAll({
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include,
      distinct: true
    });

    // Clean up and enhance product data
    const sanitizedProducts = rows.map(product => {
      const productData = product.toJSON ? product.toJSON() : product;
      
      // Extract options from variations
      if (productData.variations && productData.variations.length > 0) {
        const uniqueSizes = new Set();
        const uniqueColors = new Set();
        const colorOptions = new Map();
        
        productData.variations.forEach(variation => {
          if (variation.attributes) {
            if (variation.attributes.size) {
              uniqueSizes.add(variation.attributes.size);
            }
            
            if (variation.attributes.color) {
              const colorName = variation.attributes.color;
              uniqueColors.add(colorName);
              
              if (!colorOptions.has(colorName)) {
                const hexColor = variation.attributes.hex || 
                               variation.attributes.colorHex || 
                               getColorHex(colorName);
                
                colorOptions.set(colorName, {
                  name: colorName,
                  value: colorName.toLowerCase().replace(/\s+/g, '-'),
                  hex: hexColor
                });
              }
            }
          }
        });
        
        productData.sizeOptions = Array.from(uniqueSizes);
        productData.colorOptions = Array.from(colorOptions.values());
        
        // Calculate total stock
        productData.totalStock = productData.variations.reduce(
          (sum, variation) => sum + (variation.stockQuantity || 0), 
          0
        );
      } else {
        productData.totalStock = productData.stockQuantity || 0;
        productData.sizeOptions = [];
        productData.colorOptions = [];
      }
      
      // Calculate discount percentage
      if (productData.originalPrice && parseFloat(productData.originalPrice) > 0) {
        const original = parseFloat(productData.originalPrice);
        const current = parseFloat(productData.price);
        productData.discountPercentage = original > current 
          ? Math.round(((original - current) / original) * 100) 
          : 0;
      } else {
        productData.discountPercentage = parseFloat(productData.discount) || 0;
      }
      
      // Clean images
      if (productData.images && Array.isArray(productData.images)) {
        productData.images = productData.images.filter(img => 
          !img.startsWith('blob:')
        );
      }
      
      if (productData.thumbnail && productData.thumbnail.startsWith('blob:')) {
        productData.thumbnail = productData.images && productData.images[0] 
          ? productData.images[0] 
          : "default.jpg";
      }
      
      // Clean variation images
      if (productData.variations && Array.isArray(productData.variations)) {
        productData.variations = productData.variations.map(variation => {
          if (variation.images && Array.isArray(variation.images)) {
            variation.images = variation.images.filter(img => !img.startsWith('blob:'));
          }
          
          if (!variation.thumbnail && variation.images && variation.images.length > 0) {
            variation.thumbnail = variation.images[0];
          }
          
          return variation;
        });
      }
      
      return productData;
    });

    // Helper function
    function getColorHex(colorName) {
      const colorMap = {
        'Улаан': '#FF0000',
        'Хөх': '#0000FF',
        'Ногоон': '#008000',
        'Шар': '#FFFF00',
        'Хар': '#000000',
        'Цагаан': '#FFFFFF',
        'Саарал': '#808080',
        'Ягаан': '#FFC0CB',
        'Нарсан шар': '#FFA500',
        'Бор': '#A52A2A',
        'Цэнхэр': '#000080',
        'Ногоон цэнхэр': '#008080',
        'Хүрэн': '#8B4513'
      };
      
      return colorMap[colorName] || '#CCCCCC';
    }

    // Get min/max values from stats
    const filteredMinPrice = parseFloat(filteredPriceStats?.dataValues?.minPrice || 0);
    const filteredMaxPrice = parseFloat(filteredPriceStats?.dataValues?.maxPrice || 5000000);
    
    // Get global min/max prices from ALL products
    const globalPriceStats = await Product.findOne({
      attributes: [
        [sequelize.fn('MIN', sequelize.col('price')), 'minPrice'],
        [sequelize.fn('MAX', sequelize.col('price')), 'maxPrice']
      ]
    });
    
    const globalMinPrice = parseFloat(globalPriceStats?.dataValues?.minPrice || 0);
    const globalMaxPrice = parseFloat(globalPriceStats?.dataValues?.maxPrice || 5000000);

    res.send({
      products: sanitizedProducts,
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit),
      
      // Return both minPrice and maxPrice at root level for frontend compatibility
      minPrice: filteredMinPrice,
      maxPrice: filteredMaxPrice,
      
      // Also return priceStats object
      priceStats: {
        global: {
          min: globalMinPrice,
          max: globalMaxPrice
        },
        filtered: {
          min: filteredMinPrice,
          max: filteredMaxPrice
        }
      }
    });
  } catch (err) {
    console.error('Error in findAll:', err);
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving products.",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
// Helper function to get hex color from color name
function getColorHex(colorName) {
  const colorMap = {
    'Хар': '#000000',
    'Цагаан': '#FFFFFF',
    'Цэнхэр': '#001f3f',
    'Ногоон': '#2E8B57',
    'Улаан': '#FF0000',
    'Шар': '#FFFF00',
    'Ягаан': '#FFC0CB',
    'Хүрэн': '#964B00',
    'Саарал': '#808080',
    'Мөнгөлөг': '#C0C0C0',
    'Алт': '#FFD700'
  };
  
  return colorMap[colorName] || '#CCCCCC';
}

// Find a single Product with id
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Finding product with id:', id);
    console.log('ID type:', typeof id);
    
    const baseIncludeOptions = [
      { 
        model: db.product_variations, 
        as: 'variations',
        attributes: ['id', 'name', 'nameMn', 'price', 'originalPrice', 'sku', 
                    'images', 'inStock', 'stockQuantity', 'attributes', 'createdAt'],
        required: false
      }
    ];
    
    // Check if color_options association exists before including it
    let includeOptions = [...baseIncludeOptions];
    
    // Check if the association exists by checking if the model has the association
    // We'll try to include it, but catch the error if it fails
    try {
      // Check if association exists - use both possible names
      const hasColorOptionsAssociation = Product.associations && 
        (Product.associations.colorOptions || Product.associations.color_option);
      
      if (hasColorOptionsAssociation && db.color_options) {
        // Use the actual association name that exists
        const associationName = Product.associations.colorOptions ? 'colorOptions' : 'color_option';
        includeOptions.push({
          model: db.color_options, 
          as: associationName,
          attributes: ['id', 'name', 'nameMn', 'value', 'image'],
          required: false
        });
      } else {
        console.log('ColorOptions association not found, using base includes only');
      }
    } catch (assocCheckErr) {
      console.log('Error checking ColorOptions association, using base includes only:', assocCheckErr.message);
    }
    
    // Try to find by primary key first
    let product;
    try {
      product = await Product.findByPk(id, {
        include: includeOptions
      });
    } catch (includeErr) {
      // If include fails (association error), try without colorOptions
      if (includeErr.name === 'SequelizeEagerLoadingError' && 
          (includeErr.message.includes('color_option') || includeErr.message.includes('colorOptions'))) {
        console.log('Retrying without colorOptions due to association error...');
        includeOptions = [...baseIncludeOptions]; // Reset to base includes
        product = await Product.findByPk(id, {
          include: baseIncludeOptions
        });
      } else {
        throw includeErr;
      }
    }

    // If not found by primary key, try with where clause (sometimes works better with UUIDs)
    if (!product) {
      console.log('Product not found by findByPk, trying with where clause...');
      try {
        product = await Product.findOne({
          where: { id: id },
          include: includeOptions
        });
      } catch (includeErr) {
        if (includeErr.name === 'SequelizeEagerLoadingError' && 
            (includeErr.message.includes('color_option') || includeErr.message.includes('colorOptions'))) {
          includeOptions = [...baseIncludeOptions]; // Reset to base includes
          product = await Product.findOne({
            where: { id: id },
            include: baseIncludeOptions
          });
        } else {
          throw includeErr;
        }
      }
    }

    // If still not found, try to find by slug as fallback
    if (!product) {
      console.log('Product not found by ID, trying to find by slug...');
      try {
        product = await Product.findOne({
          where: { slug: id },
          include: includeOptions
        });
      } catch (includeErr) {
        if (includeErr.name === 'SequelizeEagerLoadingError' && 
            (includeErr.message.includes('color_option') || includeErr.message.includes('colorOptions'))) {
          includeOptions = [...baseIncludeOptions]; // Reset to base includes
          product = await Product.findOne({
            where: { slug: id },
            include: baseIncludeOptions
          });
        } else {
          throw includeErr;
        }
      }
    }

    // Last resort: Try a raw query to see if product exists at all
    if (!product) {
      console.log('Product not found by ID or slug, trying raw query...');
      try {
        const [results] = await sequelize.query(
          `SELECT * FROM products WHERE id = :id OR id::text = :id`,
          {
            replacements: { id: id },
            type: sequelize.QueryTypes.SELECT
          }
        );
        console.log('Raw query results:', results);
        if (results && results.length > 0) {
          // If found via raw query, fetch with Sequelize using the found ID
          const foundId = results[0].id;
          try {
            product = await Product.findByPk(foundId, {
              include: includeOptions
            });
          } catch (includeErr) {
            if (includeErr.name === 'SequelizeEagerLoadingError' && 
                (includeErr.message.includes('color_option') || includeErr.message.includes('colorOptions'))) {
              includeOptions = [...baseIncludeOptions]; // Reset to base includes
              product = await Product.findByPk(foundId, {
                include: baseIncludeOptions
              });
            } else {
              throw includeErr;
            }
          }
        }
      } catch (rawErr) {
        console.error('Raw query error:', rawErr);
      }
    }

    if (product) {
      // Clean up any blob URLs
      const productData = product.toJSON ? product.toJSON() : product;
      
      // Clean main product images
      if (productData.images && Array.isArray(productData.images)) {
        productData.images = productData.images.filter(img => 
          !img.startsWith('blob:')
        );
      }
      
      // Clean thumbnail
      if (productData.thumbnail && productData.thumbnail.startsWith('blob:')) {
        productData.thumbnail = productData.images && productData.images[0] 
          ? productData.images[0] 
          : "default.jpg";
      }
      
      // Clean variation images
      if (productData.variations && Array.isArray(productData.variations)) {
        productData.variations = productData.variations.map(variation => {
          if (variation.images && Array.isArray(variation.images)) {
            variation.images = variation.images.filter(img => !img.startsWith('blob:'));
          }
          return variation;
        });
      }
      
      console.log('Product found:', productData.id);
      res.send(productData);
    } else {
      console.log('Product not found with id/slug:', id);
      res.status(404).send({
        message: `Cannot find Product with id=${id}.`
      });
    }
  } catch (err) {
    console.error('Error retrieving product:', err);
    res.status(500).send({
      message: "Error retrieving Product with id=" + req.params.id,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
// Update a Product by the id in the request
exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    // Get current product to compare images
    const currentProduct = await Product.findByPk(id);
    if (!currentProduct) {
      return res.status(404).send({
        message: `Product with id=${id} not found.`
      });
    }

    // Validate images - reject blob URLs
    if (req.body.images && Array.isArray(req.body.images)) {
      const hasBlobUrls = req.body.images.some(img => img.startsWith('blob:'));
      if (hasBlobUrls) {
        return res.status(400).send({
          message: "Invalid image URLs detected. Please upload images to Cloudinary first."
        });
      }
    }

    const updateData = {};
    
    // Only include other fields that are provided
    const fields = ['name', 'nameMn', 'price', 'originalPrice', 'thumbnail', 'categoryId',
                    'category', 'subcategory', 'inStock', 'stockQuantity', 'sku', 'brand',
                    'description', 'descriptionMn', 'specifications', 'isFeatured', 'isNew', 'isOnSale',
                    'isBestSeller', 'isLimited', 'isGift', 'giftFloorLimit', 'gift_floor_limit', 'discount', 'discountAmount', 'salePrice',
                    'saleEndDate', 'sales', 'rating', 'reviewCount', 'slug', 'metaTitle',
                    'metaDescription', 'tags', 'weight', 'dimensions', 'publishedAt',
                    'images',
                    'company',
                    'bankAccountId']; // Added checkout fields
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Backward compatibility: allow snake_case bank_account_id
    if (req.body.bank_account_id !== undefined && updateData.bankAccountId === undefined) {
      updateData.bankAccountId = req.body.bank_account_id;
    }

    // Handle gift_floor_limit mapping (API uses snake_case, model uses camelCase)
    if (req.body.gift_floor_limit !== undefined) {
      updateData.giftFloorLimit = req.body.gift_floor_limit;
    }
    // Also handle is_gift mapping
    if (req.body.is_gift !== undefined) {
      updateData.isGift = req.body.is_gift;
    }

    // Update thumbnail if images exist
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      updateData.thumbnail = req.body.images[0];
    }

    const [updated] = await Product.update(updateData, {
      where: { id: id }
    });

    if (!updated) {
      return res.status(404).send({
        message: `Cannot update Product with id=${id}. Maybe Product was not found!`
      });
    }

    // Handle variations if provided
    if (req.body.variations !== undefined) {
      console.log('Updating variations:', req.body.variations);
      
      // Validate variation images
      if (Array.isArray(req.body.variations)) {
        const hasInvalidImages = req.body.variations.some(variation => 
          variation.images && Array.isArray(variation.images) && 
          variation.images.some(img => img.startsWith('blob:'))
        );
        
        if (hasInvalidImages) {
          return res.status(400).send({
            message: "Invalid variation image URLs detected."
          });
        }
      }
      
      // First, delete existing variations
      await db.product_variations.destroy({
        where: { productId: id }
      });
      
      // Then create new variations
      if (Array.isArray(req.body.variations) && req.body.variations.length > 0) {
        const variationPromises = req.body.variations.map(async (variation) => {
          return db.product_variations.create({
            name: variation.name || `Variant ${Date.now()}`,
            nameMn: variation.nameMn || variation.name || `Вариант ${Date.now()}`,
            price: variation.price || req.body.price || 0,
            originalPrice: variation.originalPrice || variation.price || req.body.price || 0,
            sku: variation.sku || `${req.body.sku || 'VAR'}-${Date.now()}`,
            images: variation.images || [],
            inStock: variation.inStock !== undefined ? variation.inStock : true,
            stockQuantity: variation.stockQuantity || 0,
            attributes: variation.attributes || {},
            productId: id
          });
        });
        
        await Promise.all(variationPromises);
      }
    }

    const updatedProduct = await Product.findByPk(id, {
      include: [
        { 
          model: db.product_variations, 
          as: 'variations',
          attributes: ['id', 'name', 'nameMn', 'price', 'originalPrice', 'sku', 
                      'images', 'inStock', 'stockQuantity', 'attributes']
        }
      ]
    });

    res.send({
      message: "Product was updated successfully.",
      product: updatedProduct
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).send({
      message: "Error updating Product with id=" + req.params.id
    });
  }
};


exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({
        message: "No image file provided"
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'products'
    });

    res.send({
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).send({
      message: "Error uploading image"
    });
  }
};

// Delete a Product with the specified id
exports.delete = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const id = req.params.id;

    // Delete all related records in the correct order
    // 1. Delete cart items (references product)
    await db.cart_items.destroy({
      where: { productId: id },
      transaction
    });

    // 2. Delete reviews (references product)
    await db.reviews.destroy({
      where: { productId: id },
      transaction
    });

    // 3. Delete product favorites (references product)
    await db.productFavorites.destroy({
      where: { productId: id },
      transaction
    });

    // 4. Delete product categories (references product)
    await db.productCategories.destroy({
      where: { productId: id },
      transaction
    });

    // 5. Delete product variations (references product)
    await db.product_variations.destroy({
      where: { productId: id },
      transaction
    });

    // 6. Delete color options (references product)
    await db.color_options.destroy({
      where: { productId: id },
      transaction
    });

    // 7. Finally delete the product itself
    const deleted = await Product.destroy({
      where: { id: id },
      transaction
    });

    await transaction.commit();

    if (deleted) {
      res.send({
        message: "Product was deleted successfully!"
      });
    } else {
      res.status(404).send({
        message: `Cannot delete Product with id=${id}. Maybe Product was not found!`
      });
    }
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting product:', err);
    console.error('Error details:', {
      message: err.message,
      name: err.name,
      stack: err.stack
    });
    res.status(500).send({
      message: "Could not delete Product with id=" + req.params.id,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// Delete all Products from the database
exports.deleteAll = async (req, res) => {
  try {
    const deleted = await Product.destroy({
      where: {},
      truncate: false
    });

    res.send({
      message: `${deleted} Products were deleted successfully!`
    });
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while removing all products."
    });
  }
};

// Find all featured Products
exports.findAllFeatured = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.findAll({
      where: { isFeatured: true },
      include: [{
        model: db.product_variations,
        as: 'variations',
        attributes: ['id', 'name', 'nameMn', 'price', 'originalPrice', 'sku', 
                    'inStock', 'stockQuantity', 'attributes', 'images', 'thumbnail'],
        required: false
      }],
      limit: limit,
      distinct: true
    });

    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving featured products."
    });
  }
};

// Find all demanded Products (sorted by sales)
exports.findAllDemanded = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const products = await Product.findAll({
      where: {
        sales: { [Op.gt]: 0 } // Only products with sales > 0
      },
      include: [{
        model: db.product_variations,
        as: 'variations',
        attributes: ['id', 'name', 'nameMn', 'price', 'originalPrice', 'sku', 
                    'inStock', 'stockQuantity', 'attributes', 'images', 'thumbnail'],
        required: false
      }],
      order: [['sales', 'DESC']], // Sort by sales descending
      limit: limit,
      distinct: true
    });

    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving demanded products."
    });
  }
};

// Find all on-sale Products
exports.findAllOnSale = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isOnSale: true },
      order: [['discount', 'DESC']],
      limit: 20
    });

    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving on-sale products."
    });
  }
};

// Find all new Products
exports.findAllNew = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isNew: true },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving new products."
    });
  }
};

// Get products by category
exports.findByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const products = await Product.findAll({
      where: { category: category },
      include: [
        { 
          model: db.product_variations, 
          as: 'variations',
          attributes: ['id', 'name', 'nameMn', 'price', 'sku', 'inStock', 'stockQuantity', 'attributes'],
          required: false
        }
      ]
    });

    // Clean blob URLs
    const sanitizedProducts = products.map(product => {
      const productData = product.toJSON ? product.toJSON() : product;
      
      if (productData.images && Array.isArray(productData.images)) {
        productData.images = productData.images.filter(img => 
          !img.startsWith('blob:')
        );
      }
      
      return productData;
    });

    res.send(sanitizedProducts);
  } catch (err) {
    res.status(500).send({
      message: err.message || `Error retrieving products in category ${req.params.category}`
    });
  }
};
// Get products by subcategory
exports.findBySubcategory = async (req, res) => {
  try {
    const subcategory = req.params.subcategory;
    const products = await Product.findAll({
      where: { subcategory: subcategory }
    });

    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message || `Error retrieving products in subcategory ${req.params.subcategory}`
    });
  }
};

// Update product stock
exports.updateStock = async (req, res) => {
  try {
    const id = req.params.id;
    const { stockQuantity, inStock } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).send({
        message: `Product with id=${id} not found.`
      });
    }

    const updateData = {};
    if (stockQuantity !== undefined) {
      updateData.stockQuantity = stockQuantity;
      updateData.inStock = stockQuantity > 0;
    }
    if (inStock !== undefined) {
      updateData.inStock = inStock;
    }

    await Product.update(updateData, {
      where: { id: id }
    });

    const updatedProduct = await Product.findByPk(id);
    res.send({
      message: "Product stock updated successfully.",
      product: updatedProduct
    });
  } catch (err) {
    res.status(500).send({
      message: `Error updating stock for product id=${req.params.id}`
    });
  }
};