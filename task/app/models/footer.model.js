// models/footer.model.js
module.exports = (sequelize, Sequelize) => {
    const Footer = sequelize.define("footer", {
        id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
        },
        // Company Info
        logoUrl: {
            type: Sequelize.STRING,
            allowNull: true,
            field: 'logo_url'
        },
        companyName: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "Outdoor World",
            field: 'company_name'
        },
        companySuffix: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: "",
            field: 'company_suffix'
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        // Social Links (stored as JSON array)
        socialLinks: {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: [],
            field: 'social_links'
        },
        // Quick Links (stored as JSON array)
        quickLinks: {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: [],
            field: 'quick_links'
        },
        // Contact Info
        phone: {
            type: Sequelize.STRING,
            allowNull: true
        },
        email: {
            type: Sequelize.STRING,
            allowNull: true
        },
        address: {
            type: Sequelize.TEXT,
            allowNull: true
        },
        // Bottom Bar
        copyrightText: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: "© 2025 Outdoor World",
            field: 'copyright_text'
        },
        // Footer Links (Privacy Policy, Terms, etc.)
        footerLinks: {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: [],
            field: 'footer_links'
        }
    }, {
        timestamps: true,
        tableName: 'footers',
        underscored: false
    });

    return Footer;
};

