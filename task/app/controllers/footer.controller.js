const db = require("../models");
const Footer = db.footers;
const Op = db.Sequelize.Op;

const LEGACY_FOOTER_DESCRIPTION =
  "ПОСЫН ЦААС БӨӨНИЙ ХУДАЛДАА, КАССЫН ТОНОГ ТӨХӨӨРӨМЖИЙН ТӨВ";
const FOOTER_TAGLINE = "Аялалын бүх үйлчилгээ нэг дор";

// Get footer data (there should only be one footer record)
exports.findOne = async (req, res) => {
  try {
    let footer = await Footer.findOne({
      order: [['createdAt', 'DESC']]
    });

    // If no footer exists, create a default one
    if (!footer) {
      footer = await Footer.create({
        companyName: "Outdoor World",
        companySuffix: "",
        description: "Аялалын бүх үйлчилгээ нэг дор",
        logoUrl: "/toor_logo.png",
        socialLinks: [
          { name: "Facebook", icon: "f", url: "#" },
          { name: "Twitter", icon: "t", url: "#" },
          { name: "Instagram", icon: "i", url: "#" },
          { name: "Pinterest", icon: "p", url: "#" }
        ],
        quickLinks: [
          { label: "Нүүр", url: "#" },
          { label: "Бүтээгдэхүүн", url: "#" },
          { label: "Ангилал", url: "#" },
          { label: "Бидний тухай", url: "#" },
          { label: "Тусламж", url: "#" }
        ],
        phone: "+976 7000-5060",
        email: "info@outdoorworld.mn",
        address: "Улаанбаатар хот, Хан-Уул дүүрэг 2-р хороо 19 Үйлчилгээний төвөөс баруун тийш 15-р сургуулийн дэргэд",
        copyrightText: "© 2025 Outdoor World",
        footerLinks: [
          { label: "Нууцлалын бодлого", url: "#" },
          { label: "Үйлчилгээний нөхцөл", url: "#" },
          { label: "Төлбөрийн нөхцөл", url: "#" }
        ]
      });
    }

    // One-time fix: DB may still store the old default blurb from a previous business.
    if (
      footer &&
      String(footer.description || "").trim() === LEGACY_FOOTER_DESCRIPTION
    ) {
      await Footer.update(
        { description: FOOTER_TAGLINE },
        { where: { id: footer.id } }
      );
      await footer.reload();
    }

    res.send(footer);
  } catch (err) {
    console.error("Error retrieving footer:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving footer.",
    });
  }
};

// Create or Update footer (upsert)
exports.createOrUpdate = async (req, res) => {
  try {
    // Check if footer exists
    let footer = await Footer.findOne({
      order: [['createdAt', 'DESC']]
    });

    const footerData = {
      companyName: req.body.companyName,
      companySuffix: req.body.companySuffix,
      description: req.body.description,
      logoUrl: req.body.logoUrl,
      socialLinks: req.body.socialLinks || [],
      quickLinks: req.body.quickLinks || [],
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      copyrightText: req.body.copyrightText,
      footerLinks: req.body.footerLinks || []
    };

    if (footer) {
      // Update existing footer
      await Footer.update(footerData, {
        where: { id: footer.id }
      });
      const updatedFooter = await Footer.findByPk(footer.id);
      res.send({
        message: "Footer was updated successfully.",
        footer: updatedFooter
      });
    } else {
      // Create new footer
      const newFooter = await Footer.create(footerData);
      res.send({
        message: "Footer was created successfully.",
        footer: newFooter
      });
    }
  } catch (err) {
    console.error("Error creating/updating footer:", err);
    res.status(500).send({
      message: err.message || "Some error occurred while creating/updating footer.",
    });
  }
};

// Update footer
exports.update = async (req, res) => {
  try {
    const id = req.params.id || (await Footer.findOne({ order: [['createdAt', 'DESC']] }))?.id;

    if (!id) {
      return res.status(404).send({
        message: "Footer not found."
      });
    }

    const updates = {};
    
    if (req.body.companyName !== undefined) updates.companyName = req.body.companyName;
    if (req.body.companySuffix !== undefined) updates.companySuffix = req.body.companySuffix;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.logoUrl !== undefined) updates.logoUrl = req.body.logoUrl;
    if (req.body.socialLinks !== undefined) updates.socialLinks = req.body.socialLinks;
    if (req.body.quickLinks !== undefined) updates.quickLinks = req.body.quickLinks;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.address !== undefined) updates.address = req.body.address;
    if (req.body.copyrightText !== undefined) updates.copyrightText = req.body.copyrightText;
    if (req.body.footerLinks !== undefined) updates.footerLinks = req.body.footerLinks;

    const [updated] = await Footer.update(updates, {
      where: { id: id },
    });

    if (updated) {
      const updatedFooter = await Footer.findByPk(id);
      res.send({
        message: "Footer was updated successfully.",
        footer: updatedFooter,
      });
    } else {
      res.status(404).send({
        message: `Cannot update Footer with id=${id}. Maybe not found!`,
      });
    }
  } catch (err) {
    console.error("Error updating footer:", err);
    res.status(500).send({
      message: "Error updating Footer",
    });
  }
};

