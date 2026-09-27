const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const Url = require("./models/Url");
const User = require("./models/User");
const Click = require("./models/Click");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// MongoDB Connection
// ===============================

mongoose
.connect(process.env.MONGO_URI)
.then(() => {
console.log("MongoDB connected successfully");
})
.catch((error) => {
console.error(
"MongoDB connection failed:",
error.message
);
});

// ===============================
// Generate Short Code
// ===============================

function generateCode() {
return Math.random()
.toString(36)
.substring(2, 8);
}

// ===============================
// Home Route
// ===============================

app.get("/", (req, res) => {
res.json({
message: "URL Shortener Backend is running"
});
});

// ===============================
// REGISTER
// ===============================

app.post(
"/api/auth/register",
async (req, res) => {
try {
const {
name,
email,
password
} = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message:
                    "Name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message:
                    "Password must be at least 6 characters"
            });
        }

        const cleanEmail =
            email.toLowerCase().trim();

        const existingUser =
            await User.findOne({
                email: cleanEmail
            });

        if (existingUser) {
            return res.status(409).json({
                message:
                    "Email already registered"
            });
        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );

        const newUser =
            new User({
                name: name.trim(),
                email: cleanEmail,
                password: hashedPassword
            });

        await newUser.save();

        res.status(201).json({
            message:
                "Registration successful"
        });
    } catch (error) {
        console.error(
            "Registration error:",
            error
        );

        res.status(500).json({
            message: "Server error"
        });
    }
}


);

// ===============================
// LOGIN
// ===============================

app.post(
"/api/auth/login",
async (req, res) => {
try {
const {
email,
password
} = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message:
                    "Email and password are required"
            });
        }

        const cleanEmail =
            email.toLowerCase().trim();

        const user =
            await User.findOne({
                email: cleanEmail
            });

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                message:
                    "Invalid email or password"
            });
        }

        const token =
            jwt.sign(
                {
                    userId: user._id
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

        res.json({
            message:
                "Login successful",

            token: token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            message: "Server error"
        });
    }
}


);

// ===============================
// CREATE SHORT URL
// ===============================

app.post(
"/api/shorten",
async (req, res) => {
try {
const {
url,
customAlias,
expiration
} = req.body;

        // ===============================
        // Check URL
        // ===============================

        if (!url || !url.trim()) {
            return res.status(400).json({
                message: "URL is required"
            });
        }

        // ===============================
        // Validate URL
        // ===============================

        let parsedUrl;

        try {
            parsedUrl =
                new URL(url.trim());
        } catch {
            return res.status(400).json({
                message:
                    "Please enter a valid URL"
            });
        }

        // ===============================
        // Only HTTP / HTTPS
        // ===============================

        if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
        ) {
            return res.status(400).json({
                message:
                    "Only HTTP and HTTPS URLs are allowed"
            });
        }

        // ===============================
        // Check Authentication
        // ===============================

        let userId = null;
        let isGuest = true;

        const authHeader =
            req.headers.authorization;

        if (authHeader) {
            try {
                const token =
                    authHeader.split(" ")[1];

                if (token) {
                    const decoded =
                        jwt.verify(
                            token,
                            process.env.JWT_SECRET
                        );

                    userId =
                        decoded.userId;

                    isGuest = false;
                }
            } catch {
                userId = null;
                isGuest = true;
            }
        }

        // ===============================
        // Expiration
        // ===============================

        let expiresAt = null;

        const durations = {
            "1h":
                60 *
                60 *
                1000,

            "1d":
                24 *
                60 *
                60 *
                1000,

            "7d":
                7 *
                24 *
                60 *
                60 *
                1000,

            "30d":
                30 *
                24 *
                60 *
                60 *
                1000
        };

        if (isGuest) {
            expiresAt =
                new Date(
                    Date.now() +
                    durations["1h"]
                );
        } else {
            if (expiration) {
                if (!durations[expiration]) {
                    return res.status(400).json({
                        message:
                            "Invalid expiration option"
                    });
                }

                expiresAt =
                    new Date(
                        Date.now() +
                        durations[expiration]
                    );
            }
        }

        // ===============================
        // Generate Short Code
        // ===============================

        let code;

        if (
            customAlias &&
            customAlias.trim()
        ) {
            code =
                customAlias.trim();

            if (
                !/^[a-zA-Z0-9_-]+$/.test(code)
            ) {
                return res.status(400).json({
                    message:
                        "Custom alias can only contain letters, numbers, hyphens and underscores"
                });
            }

            const existingAlias =
                await Url.findOne({
                    shortCode: code
                });

            if (existingAlias) {
                return res.status(409).json({
                    message:
                        "This custom alias is already taken"
                });
            }
        } else {
            let existingUrl;

            do {
                code =
                    generateCode();

                existingUrl =
                    await Url.findOne({
                        shortCode: code
                    });
            } while (existingUrl);
        }

        // ===============================
        // Save URL
        // ===============================

        const newUrl =
            new Url({
                originalUrl:
                    url.trim(),

                shortCode:
                    code,

                expiresAt:
                    expiresAt,

                userId:
                    userId
            });

        await newUrl.save();

        // ===============================
        // Response
        // ===============================

        const baseUrl =
            process.env.BASE_URL ||
            `http://localhost:${process.env.PORT || 5000}`;

        res.json({
            originalUrl:
                url.trim(),

            shortUrl:
                `${baseUrl}/${code}`,

            expiresAt:
                expiresAt,

            guest:
                isGuest
        });
    } catch (error) {
        console.error(
            "Create URL error:",
            error
        );

        res.status(500).json({
            message: "Server error"
        });
    }
}


);

// ===============================
// GET USER'S URLs
// ===============================

app.get(
"/api/urls",
authMiddleware,
async (req, res) => {
try {
const urls =
await Url.find({
userId: req.userId
}).sort({
createdAt: -1
});

        res.json(urls);
    } catch (error) {
        console.error(
            "Fetch URLs error:",
            error
        );

        res.status(500).json({
            message: "Server error"
        });
    }
}


);

// ===============================
// ANALYTICS
// ===============================

app.get(
"/api/analytics",
authMiddleware,
async (req, res) => {
try {
// ===============================
// Get user's URLs
// ===============================

        const urls =
            await Url.find({
                userId: req.userId
            }).sort({
                clicks: -1
            });

        const now =
            new Date();

        // ===============================
        // Total Links
        // ===============================

        const totalLinks =
            urls.length;

        // ===============================
        // Total Clicks
        // ===============================

        const totalClicks =
            urls.reduce(
                (total, url) =>
                    total +
                    (url.clicks || 0),
                0
            );

        // ===============================
        // Active Links
        // ===============================

        const activeLinks =
            urls.filter((url) => {
                if (!url.expiresAt) {
                    return true;
                }

                return (
                    new Date(
                        url.expiresAt
                    ) > now
                );
            }).length;

        // ===============================
        // Expired Links
        // ===============================

        const expiredLinks =
            urls.filter((url) => {
                return (
                    url.expiresAt &&
                    new Date(
                        url.expiresAt
                    ) <= now
                );
            }).length;

        // ===============================
        // Average Clicks
        // ===============================

        const averageClicks =
            totalLinks > 0
                ? Number(
                      (
                          totalClicks /
                          totalLinks
                      ).toFixed(2)
                  )
                : 0;

        // ===============================
        // Top Performing URLs
        // ===============================

        const topLinks =
            urls
                .slice(0, 5)
                .map((url) => ({
                    id: url._id,
                    shortCode:
                        url.shortCode,
                    originalUrl:
                        url.originalUrl,
                    clicks:
                        url.clicks || 0,
                    createdAt:
                        url.createdAt,
                    expiresAt:
                        url.expiresAt
                }));

        // ===============================
        // User URL IDs
        // ===============================

        const urlIds =
            urls.map(
                (url) => url._id
            );

        // ===============================
        // Click History
        // ===============================

        const clicks =
            await Click.find({
                urlId: {
                    $in: urlIds
                }
            }).sort({
                clickedAt: 1
            });

        // ===============================
        // Today's Clicks
        // ===============================

        const startOfToday =
            new Date();

        startOfToday.setHours(
            0,
            0,
            0,
            0
        );

        const clicksToday =
            clicks.filter(
                (click) =>
                    new Date(
                        click.clickedAt
                    ) >= startOfToday
            ).length;

        // ===============================
        // Last 7 Days
        // ===============================

        const sevenDaysAgo =
            new Date();

        sevenDaysAgo.setDate(
            sevenDaysAgo.getDate() - 6
        );

        sevenDaysAgo.setHours(
            0,
            0,
            0,
            0
        );

        const recentClicks =
            clicks.filter(
                (click) =>
                    new Date(
                        click.clickedAt
                    ) >= sevenDaysAgo
            );

        // ===============================
        // Daily Click Data
        // ===============================

        const dailyClicks = [];

        for (
            let i = 6;
            i >= 0;
            i--
        ) {
            const date =
                new Date();

            date.setDate(
                date.getDate() - i
            );

            date.setHours(
                0,
                0,
                0,
                0
            );

            const nextDate =
                new Date(date);

            nextDate.setDate(
                nextDate.getDate() + 1
            );

            const count =
                recentClicks.filter(
                    (click) => {
                        const clickDate =
                            new Date(
                                click.clickedAt
                            );

                        return (
                            clickDate >=
                                date &&
                            clickDate <
                                nextDate
                        );
                    }
                ).length;

            dailyClicks.push({
                date:
                    date
                        .toISOString()
                        .split("T")[0],

                clicks:
                    count
            });
        }

        // ===============================
        // Response
        // ===============================

        res.json({
            totalLinks,
            totalClicks,
            activeLinks,
            expiredLinks,
            averageClicks,
            clicksToday,
            dailyClicks,
            topLinks
        });
    } catch (error) {
        console.error(
            "Analytics error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch analytics"
        });
    }
}


);

// ===============================
// DELETE USER'S URL
// ===============================

app.delete(
"/api/urls/:id",
authMiddleware,
async (req, res) => {
try {
const deletedUrl =
await Url.findOneAndDelete({
_id: req.params.id,
userId: req.userId
});

        if (!deletedUrl) {
            return res.status(404).json({
                message:
                    "URL not found"
            });
        }

        // Delete associated click history too

        await Click.deleteMany({
            urlId:
                deletedUrl._id
        });

        res.json({
            message:
                "URL deleted successfully"
        });
    } catch (error) {
        console.error(
            "Delete URL error:",
            error
        );

        res.status(500).json({
            message: "Server error"
        });
    }
}


);

// ===============================
// REDIRECT
// ===============================

app.get(
"/:code",
async (req, res) => {
try {
const url =
await Url.findOne({
shortCode:
req.params.code
});


        if (!url) {
            return res.status(404).send(
                "Short URL not found"
            );
        }

        // ===============================
        // Check Expiration
        // ===============================

        if (
            url.expiresAt &&
            url.expiresAt <=
                new Date()
        ) {
            return res.status(410).send(
                "This short URL has expired"
            );
        }

        // ===============================
        // Count Click
        // ===============================

        url.clicks += 1;

        await url.save();

        // ===============================
        // Save Click Event
        // ===============================

        await Click.create({
            urlId: url._id
        });

        // ===============================
        // Redirect
        // ===============================

        res.redirect(
            url.originalUrl
        );
    } catch (error) {
        console.error(
            "Redirect error:",
            error
        );

        res.status(500).send(
            "Server error"
        );
    }
}

);

// ===============================
// START SERVER
// ===============================

const PORT =
process.env.PORT || 5000;

app.listen(
PORT,
"0.0.0.0",
() => {
console.log(
`Server running on port ${PORT}`
);
}
);
