import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    service: process.env.SMTP_SERVICE,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const renderTemplate = async (templateName: string, data: object) => {
    const templatePath = path.join(
        process.cwd(),
        "apps",
        "order-service",
        "utils",
        "email-templates",
        `${templateName}.ejs`
    );
    return ejs.renderFile(templatePath, data);
};

export const sendEmail = async (
    to: string,
    subject: string,
    templateName: string,
    data: object
) => {
    try {
        const html = await renderTemplate(templateName, data);
        await transporter.sendMail({
            from: `<${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        return true;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
};