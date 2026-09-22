const sendWelcomeEmail = async (user, plainTextPassword) => {
  try {
    if (!plainTextPassword) {
      throw new Error("Plain-text password is required");
    }

    const registeredOn = new Date(
      user.createdAt || Date.now()
    ).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const accountStatus = user.status
      ? user.status.charAt(0).toUpperCase() + user.status.slice(1)
      : "Active";

    const templateParams = {
      to_email: user.email,
      to_name: user.name,

      name: user.name,
      email: user.email,
      mobile: user.mobile,
      country: user.country,
      district: user.district,

      user_id: user.userId,

      // Original password entered during registration
      password: plainTextPassword,

      referral_code: user.referralCode,

      registered_on: registeredOn,

      account_status: accountStatus,
    };

    const response = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,

          template_params: templateParams,

          accessToken: process.env.EMAILJS_PRIVATE_KEY,
        }),
      }
    );

    const result = await response.text();

    if (!response.ok) {
      throw new Error(
        `EmailJS Error ${response.status}: ${result}`
      );
    }

    console.log(
      `Welcome email sent successfully to ${user.email}`
    );

    return true;
  } catch (error) {
    console.error(
      `Welcome email failed for ${user.email}:`,
      error.message
    );

    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
};