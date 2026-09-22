const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },
        mobile: {
            type: String,
            trim: true,
            required: [true, "Mobile number is required"],
        },
        subject: {
            type: String,
            trim: true,
            default: "Customer Query",
            required: [true, "Subject is required"]
        },
        message: {
            type: String,
            required: [true, "Message is required"],
            trim: true,
        },
        emailStatus: {
            type: String,
            enum: ["pending", "sent", "failed"],
            default: "pending",
        },
        emailError: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
