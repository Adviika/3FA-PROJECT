import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import nodemailer from "nodemailer";
import { spawn } from "child_process";
import path, { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import fs from "fs";
import bodyParser from 'body-parser';
import { UserModel } from "./database/db.js";
// import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";
import {verifyRecaptcha} from "./verifyRecaptcha.js"


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup multer for image uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

const saltRounds = 10;
const app = express();

app.use(bodyParser.json({ limit: '10mb' })); // Adjust the limit as needed
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

mongoose.connect("mongodb+srv://admin:pH4kLUOqE0Mub5w3@cluster0.950s0.mongodb.net/protech");

const port = 8080;

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "protechtotherescue@gmail.com",
        pass: "gccg ckfc davl uvhl",
    },
});

const RECAPTCHA_SECRET_KEY = "6LdS3YIqAAAAAOSIfpK3iG2-2oZRO2SoaunsNOST"; // Replace with your actual secret key

// Function to verify reCAPTCHA
// async function verifyRecaptcha(token, recaptchaAction) {
//     // const { RecaptchaEnterpriseServiceClient } = require("@google-cloud/recaptcha-enterprise");
//     const projectID = "protech-1731958889414"; // Replace with your Google Cloud Project ID
//     const recaptchaKey = "6LdS3YIqAAAAAOSIfpK3iG2-2oZRO2SoaunsNOST"; // Replace with your site key

//     const client = new RecaptchaEnterpriseServiceClient();
//     const projectPath = client.projectPath(projectID);

//     try {
//         const request = {
//             assessment: {
//                 event: {
//                     token: token,
//                     siteKey: recaptchaKey,
//                 },
//             },
//             parent: projectPath,
//         };

//         const [response] = await client.createAssessment(request);

//         if (!response.tokenProperties.valid) {
//             console.error("Invalid reCAPTCHA token:", response.tokenProperties.invalidReason);
//             return { success: false, message: "Invalid CAPTCHA token." };
//         }

//         if (response.tokenProperties.action !== recaptchaAction) {
//             console.error("Mismatched reCAPTCHA action.");
//             return { success: false, message: "CAPTCHA action mismatch." };
//         }

//         const score = response.riskAnalysis.score;
//         console.log(`reCAPTCHA Score: ${score}`);

//         // Evaluate the risk score (you can customize the threshold as needed)
//         if (score < 0.5) {
//             console.warn("Low reCAPTCHA score detected.");
//             return { success: false, message: "Suspicious activity detected." };
//         }

//         return { success: true, score };
//     } catch (error) {
//         console.error("Error verifying reCAPTCHA:", error.message);
//         return { success: false, message: "Error verifying CAPTCHA." };
//     }
// }



// Login route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        // Validate user credentials
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found." });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: "Invalid password." });

        // Generate and email OTP
        const otp = speakeasy.totp({
            secret: speakeasy.generateSecret().base32,
            encoding: "base32",
            step: 300, // 5-minute OTP
        });

        const mailOptions = {
            from: "protechtotherescue@gmail.com",
            to: email,
            subject: "Your OTP for login",
            text: `Your OTP is: ${otp}`,
        };

        transporter.sendMail(mailOptions, async (error) => {
            if (error) {
                console.error("Failed to send OTP:", error.message);
                return res.status(500).json({ message: "Failed to send OTP." });
            }

            user.otp = otp; // Optionally encrypt OTP before saving
            user.otpExpires = Date.now() + 300000; // 5-minute expiry
            await user.save();

            res.json({ message: "OTP sent to your email!" });
        });
    } catch (error) {
        console.error("Error during login:", error.message);
        res.status(500).json({ message: "Error during login." });
    }
});

// OTP verification route
app.post("/verifyOtp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found." });

        if (Date.now() > user.otpExpires) return res.status(400).json({ message: "OTP expired." });

        if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP." });

        user.otp = null; // Clear OTP after verification
        user.otpExpires = null;
        await user.save();

        res.json({ message: "OTP verified successfully, login successful!" });
    } catch (error) {
        console.error("Error verifying OTP:", error.message);
        res.status(500).json({ message: "Error during OTP verification." });
    }
});

app.post("/verifyFace2", async (req,res)=>{
    
    const {email} = req.body;
    console.log(email);
    try{
        const user = await UserModel.findOne({email});
        console.log(user);
        if (!user) return res.status(400).json({isLoggedIn: false});
        else{
            res.status(200).json({isLoggedIn: true});
        }
    } catch(error){
        res.status(500).json({err: error})
    }
})

// Face verification route
app.post("/verifyFace", async (req, res) => {
    const { email, image } = req.body;

    

    try {
        const user = await UserModel.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found." });

        // Decode base64 image
        const base64Data = image.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");

        // Save image to file or process directly
        const tempImagePath = `uploads/faceVerification_${Date.now()}.png`;
        fs.writeFileSync(tempImagePath, imageBuffer);

        // Now process the image using your Python script
        const pythonProcess = spawn("python", ["face_verification.py", tempImagePath]);

        let output = "";
        let error = "";

        pythonProcess.stdout.on("data", (data) => (output += data.toString()));
        pythonProcess.stderr.on("data", (data) => (error += data.toString()));

        pythonProcess.on("close", (code) => {
            if (code !== 0) {
                console.error("Python script error:", error);
                return res.status(500).json({ message: "Face verification failed." });
            }

            if (output.trim() === "User verified") {
                res.json({ message: "Face verified successfully, access granted!" });
            } else {
                res.status(400).json({ message: "Face verification failed." });
            }
        });
    } catch (error) {
        console.error("Error during face verification:", error.message);
        res.status(500).json({ message: "Error during face verification." });
    }
});



// Registration route
app.post("/register", upload.single("image"), async (req, res) => {
    console.log("Request received at /register"); // Checkpoint 1
    const { name, email, password } = req.body;
    const token = req.body["g-recaptcha-response"]; // Captcha response from frontend
    // const recaptchaAction = "register"; // Match the action set in the frontend

    console.log("Request body:", { name, email }); // Checkpoint 2: Log input data (excluding sensitive info)

    try {
        console.log("Starting CAPTCHA verification"); // Checkpoint 3
        const captchaResult = await verifyRecaptcha(token);
        console.log("CAPTCHA verification result:", captchaResult); // Checkpoint 4

        if (captchaResult.success) {
            console.warn("CAPTCHA failed:", captchaResult.message); // Checkpoint 5: Log failed CAPTCHA reason
            return res.status(400).json({ message: captchaResult.message });
        }

        console.log("Checking for existing user"); // Checkpoint 6
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            console.warn("User already exists with email:", email); // Checkpoint 7
            return res.status(400).json({ message: "User already exists." });
        }

        console.log("Hashing password"); // Checkpoint 8
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log("Password hashed successfully"); // Checkpoint 9

        const imagePath = req.file ? req.file.path : null;
        console.log("Image path:", imagePath); // Checkpoint 10: Log uploaded image path (if any)

        console.log("Creating new user in database"); // Checkpoint 11
        const newUser = new UserModel({ name, email, password: hashedPassword, profileImage: imagePath });
        await newUser.save();
        console.log("User saved successfully"); // Checkpoint 12

        res.json({ isLoggedIn: true, message: "User registered successfully!" });
    } catch (error) {
        console.error("Error during registration:", error.message); // Checkpoint 13: Log errors
        res.status(500).json({ message: "Error during registration." });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
