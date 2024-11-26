import axios from "axios";

export async function verifyRecaptcha (token) {
    const secretKey = '6Lc7FocqAAAAALo8nXPGgO_9NthuVj_ql9Kc07IS';
    const url = "https://www.google.com/recaptcha/api/siteverify";

    try {
        const response = await axios.post(url, null, {
            params: {
                secret: secretKey,
                response: token,
            },
        });

        return response.data.success;
    } catch (error) {
        console.error('Error validating reCAPTCHA:', error);
        return false;
    }
}

// export default verifyRecaptcha;