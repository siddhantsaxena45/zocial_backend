import jwt from "jsonwebtoken";

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized", success: false });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.id = decoded.userId;
        next();
    }
    catch (error) {
        console.log(error);
    }
}

export default isAuthenticated