const express = require("express");

const {
    sendContactEmail,
    getAllContacts
} = require("../Controller/contact.controller");

const router = express.Router();

router.post("/contact", sendContactEmail);
router.get("/contact", getAllContacts);

module.exports = router;