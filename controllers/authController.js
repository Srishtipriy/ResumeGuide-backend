
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB } = require("../config/db");

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const users = getDB().collection("users");
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await users.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await users.insertOne({
      name: name.trim(),
      email: normalizedEmail,
      password_hash: hashedPassword,
      createdAt: new Date()
    });

    return res.status(201).json({
      message: "Account created successfully!",
      userId: result.insertedId.toString()
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Could not create account"
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await getDB().collection("users").findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Server error"
    });
  }
};

module.exports = { register, login };
