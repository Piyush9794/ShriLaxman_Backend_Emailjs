const Contact = require("../Models/Contact.model");

/**
 * Handle incoming customer queries:
 * 1. Validates inputs
 * 2. Saves the query in MongoDB
 * 3. Dispatches email to vishwakarmapiyush327@gmail.com via EmailJS
 */
const sendContactEmail = async (req, res) => {
    try {
        const {
            name,
            email,
            subject,
            mobile,
            phone,
            message
        } = req.body;

        // Input validations
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required"
            });
        }

        const customerMobile = (mobile || phone || "").trim();
        if (!customerMobile) {
            return res.status(400).json({
                success: false,
                message: "Mobile number is required"
            });
        }

        // Email is optional, but validate format if provided
        const customerEmail = email && email.trim() ? email.trim() : "";
        if (customerEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid email address"
                });
            }
        }

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        const querySubject = subject && subject.trim() ? subject.trim() : "Customer Query";

        // 1. Cooldown / Rate Limiting (User must wait 2 minutes between submissions)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const queryConditions = [{ mobile: customerMobile }];
        if (customerEmail) {
            queryConditions.push({ email: customerEmail });
        }

        try {
            const recentQuery = await Contact.findOne({
                $or: queryConditions,
                createdAt: { $gte: twoMinutesAgo }
            }).sort({ createdAt: -1 });

            if (recentQuery) {
                const timePassedMs = Date.now() - new Date(recentQuery.createdAt).getTime();
                const remainingSeconds = Math.max(1, Math.ceil((2 * 60 * 1000 - timePassedMs) / 1000));

                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remainingSeconds} second(s) before submitting another query.`,
                    remainingSeconds
                });
            }
        } catch (searchError) {
            console.warn("Cooldown check query error:", searchError.message);
        }

        // 2. Save query to MongoDB
        let savedContact;
        try {
            savedContact = await Contact.create({
                name: name.trim(),
                email: customerEmail,
                mobile: customerMobile,
                subject: querySubject,
                message: message.trim(),
                emailStatus: "pending"
            });
        } catch (dbError) {
            console.error("Database save failed:", dbError.message);
            return res.status(500).json({
                success: false,
                message: "Failed to store customer query in database",
                error: dbError.message
            });
        }

        // 2. Prepare EmailJS forwarding
        const {
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            EMAILJS_PUBLIC_KEY,
            EMAILJS_PRIVATE_KEY,
            EMAIL_USER
        } = process.env;

        const recipientEmail = EMAIL_USER || "vishwakarmapiyush327@gmail.com";

        if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
            console.warn("⚠️ EmailJS configuration is missing in environment variables.");
            await Contact.findByIdAndUpdate(savedContact._id, {
                emailStatus: "failed",
                emailError: "EmailJS configuration missing"
            });

            return res.status(200).json({
                success: true,
                message: "Query saved in database, but email service is not fully configured.",
                data: savedContact
            });
        }

        const now = new Date();
        const formattedTime = now.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short"
        });

        const templateParams = {
            to_email: recipientEmail,
            to_name: "Piyush Vishwakarma",
            recipient_email: recipientEmail,
            from_name: name.trim(),
            from_email: customerEmail || "Not provided",
            reply_to: customerEmail || recipientEmail,
            name: name.trim(),
            email: customerEmail || "Not provided",
            mobile: customerMobile,
            phone: customerMobile,
            subject: querySubject,
            title: querySubject,
            time: formattedTime,
            date: formattedTime,
            message: message.trim()
        };

        const emailJSBody = {
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: templateParams
        };

        if (EMAILJS_PRIVATE_KEY) {
            emailJSBody.accessToken = EMAILJS_PRIVATE_KEY;
        }

        let emailSent = false;
        let emailErrorDetail = null;

        try {
            const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Origin": "http://localhost:5000",
                    "User-Agent": "Mozilla/5.0"
                },
                body: JSON.stringify(emailJSBody)
            });

            const result = await response.text();

            if (response.ok) {
                emailSent = true;
                await Contact.findByIdAndUpdate(savedContact._id, {
                    emailStatus: "sent",
                    emailError: null
                });
                console.log(`✅ Customer query email successfully forwarded to ${recipientEmail}`);
            } else {
                console.error("❌ EmailJS API returned error:", response.status, result);
                emailErrorDetail = result;
                await Contact.findByIdAndUpdate(savedContact._id, {
                    emailStatus: "failed",
                    emailError: `Status ${response.status}: ${result}`
                });
            }
        } catch (fetchError) {
            console.error("❌ EmailJS fetch failed:", fetchError.message);
            emailErrorDetail = fetchError.message;
            await Contact.findByIdAndUpdate(savedContact._id, {
                emailStatus: "failed",
                emailError: fetchError.message
            });
        }

        if (emailSent) {
            return res.status(200).json({
                success: true,
                message: "Your query has been submitted successfully and forwarded to email.",
                data: savedContact
            });
        } else {
            return res.status(207).json({
                success: true,
                message: "Query saved successfully, but email delivery encountered an issue.",
                emailError: emailErrorDetail,
                data: savedContact
            });
        }
    } catch (error) {
        console.error("CONTACT API ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while processing your query",
            error: error.message
        });
    }
};

/**
 * Retrieve all contact queries (for admin view)
 */
const getAllContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: contacts.length,
            data: contacts
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer queries",
            error: error.message
        });
    }
};

module.exports = {
    sendContactEmail,
    getAllContacts
};