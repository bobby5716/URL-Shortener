import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./App.css";
import BlurText from "./components/BlurText";
import ShinyText from "./components/ShinyText";
import SpotlightCard from "./components/SpotlightCard";
import BorderGlow from "./components/BorderGlow";

const API_URL = "http://localhost:5000";

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(
        !!localStorage.getItem("token")
    );

    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [authMode, setAuthMode] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authMessage, setAuthMessage] = useState("");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    const [url, setUrl] = useState("");
    const [customAlias, setCustomAlias] = useState("");
    const [expiration, setExpiration] = useState("");
    const [shortUrl, setShortUrl] = useState("");
    const [shortUrlExpiration, setShortUrlExpiration] =
        useState(null);

    const [isGuest, setIsGuest] = useState(
        !localStorage.getItem("token")
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [urls, setUrls] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    // ===============================
    // Analytics State
    // ===============================

    const [analytics, setAnalytics] = useState({
        totalLinks: 0,
        totalClicks: 0,
        activeLinks: 0,
        expiredLinks: 0,
        averageClicks: 0,
        clicksToday: 0,
        dailyClicks: [],
        topLinks: []
    });

    const [analyticsLoading, setAnalyticsLoading] =
        useState(false);

    // ===============================
    // Authentication
    // ===============================

    const handleAuth = async (e) => {
        e.preventDefault();

        setAuthMessage("");
        setAuthError("");
        setAuthLoading(true);

        try {
            const endpoint =
                authMode === "register"
                    ? `${API_URL}/api/auth/register`
                    : `${API_URL}/api/auth/login`;

            const body =
                authMode === "register"
                    ? {
                          name,
                          email,
                          password
                      }
                    : {
                          email,
                          password
                      };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                setAuthError(
                    data.message || "Something went wrong"
                );
                return;
            }

            if (authMode === "register") {
                setAuthMessage(
                    "Registration successful. Please login."
                );

                setName("");
                setEmail("");
                setPassword("");
                setAuthMode("login");

                return;
            }

            localStorage.setItem(
                "token",
                data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            setUser(data.user);
            setIsLoggedIn(true);
            setIsGuest(false);

            setEmail("");
            setPassword("");
            setAuthError("");
            setAuthMessage("");
        } catch (error) {
            console.error(error);

            setAuthError(
                "Unable to connect to the server"
            );
        } finally {
            setAuthLoading(false);
        }
    };

    // ===============================
    // Guest Mode
    // ===============================

    const handleGuestMode = () => {
        setIsLoggedIn(false);
        setIsGuest(true);

        setAuthError("");
        setAuthMessage("");

        setShortUrl("");
        setShortUrlExpiration(null);
        setError("");
    };

    // ===============================
    // Logout
    // ===============================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setIsLoggedIn(false);
        setIsGuest(true);
        setUser(null);

        setUrls([]);

        setAnalytics({
            totalLinks: 0,
            totalClicks: 0,
            activeLinks: 0,
            expiredLinks: 0,
            averageClicks: 0,
            clicksToday: 0,
            dailyClicks: [],
            topLinks: []
        });

        setShortUrl("");
        setShortUrlExpiration(null);

        setSearchTerm("");
        setFilterStatus("all");

        setUrl("");
        setCustomAlias("");
        setExpiration("");
    };

    // ===============================
    // Fetch URLs
    // ===============================

    const fetchUrls = async () => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/urls`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    handleLogout();
                    return;
                }

                throw new Error(
                    data.message ||
                        "Failed to fetch URLs"
                );
            }

            setUrls(data);
        } catch (error) {
            console.error(
                "Failed to fetch URLs:",
                error
            );
        }
    };

    // ===============================
    // Fetch Analytics
    // ===============================

    const fetchAnalytics = async () => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            return;
        }

        setAnalyticsLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/api/analytics`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    handleLogout();
                    return;
                }

                throw new Error(
                    data.message ||
                        "Failed to fetch analytics"
                );
            }

            setAnalytics({
                totalLinks: data.totalLinks ?? 0,
                totalClicks: data.totalClicks ?? 0,
                activeLinks: data.activeLinks ?? 0,
                expiredLinks: data.expiredLinks ?? 0,
                averageClicks:
                    data.averageClicks ?? 0,
                clicksToday:
                    data.clicksToday ?? 0,
                dailyClicks:
                    data.dailyClicks ?? [],
                topLinks:
                    data.topLinks ?? []
            });
        } catch (error) {
            console.error(
                "Failed to fetch analytics:",
                error
            );
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // ===============================
    // Load Dashboard Data
    // ===============================

    useEffect(() => {
        if (isLoggedIn) {
            fetchUrls();
            fetchAnalytics();
        }
    }, [isLoggedIn]);

    // ===============================
    // Shorten URL
    // ===============================

    const handleShorten = async () => {
        if (!url.trim()) {
            setError("Please enter a URL");
            return;
        }

        setLoading(true);
        setError("");
        setShortUrl("");
        setShortUrlExpiration(null);

        try {
            const token =
                localStorage.getItem("token");

            const headers = {
                "Content-Type":
                    "application/json"
            };

            if (token) {
                headers.Authorization =
                    `Bearer ${token}`;
            }

            const response = await fetch(
                `${API_URL}/api/shorten`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        url,
                        customAlias,
                        expiration:
                            isGuest
                                ? ""
                                : expiration
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    handleLogout();
                    return;
                }

                setError(
                    data.message ||
                        "Something went wrong"
                );

                return;
            }

            setShortUrl(data.shortUrl);

            setShortUrlExpiration(
                data.expiresAt
            );

            setUrl("");
            setCustomAlias("");

            if (isLoggedIn) {
                setExpiration("");

                await fetchUrls();
                await fetchAnalytics();
            }
        } catch (error) {
            console.error(error);

            setError(
                "Unable to connect to the server"
            );
        } finally {
            setLoading(false);
        }
    };

    // ===============================
    // Delete URL
    // ===============================

    const handleDelete = async (id) => {
        const token =
            localStorage.getItem("token");

        if (!token) {
            setError(
                "Login is required to delete URLs"
            );

            return;
        }

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this shortened URL?"
            );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/urls/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    handleLogout();
                    return;
                }

                setError(
                    data.message ||
                        "Failed to delete URL"
                );

                return;
            }

            setUrls((currentUrls) =>
                currentUrls.filter(
                    (item) =>
                        item._id !== id
                )
            );

            await fetchAnalytics();
        } catch (error) {
            console.error(
                "Delete URL error:",
                error
            );

            setError(
                "Unable to connect to the server"
            );
        }
    };

    // ===============================
    // Copy URL
    // ===============================

    const copyShortUrl = async () => {
        if (!shortUrl) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                shortUrl
            );
        } catch (error) {
            console.error(
                "Copy failed:",
                error
            );
        }
    };

    // ===============================
    // Download QR
    // ===============================

    const downloadQRCode = () => {
        const canvas =
            document.getElementById(
                "short-url-qr"
            );

        if (!canvas) {
            return;
        }

        const pngUrl = canvas
            .toDataURL("image/png")
            .replace(
                "image/png",
                "image/octet-stream"
            );

        const downloadLink =
            document.createElement("a");

        downloadLink.href = pngUrl;

        downloadLink.download =
            "url-shortener-qr.png";

        document.body.appendChild(
            downloadLink
        );

        downloadLink.click();

        document.body.removeChild(
            downloadLink
        );
    };

    // ===============================
    // Format Expiration
    // ===============================

    const formatExpiration = (expiresAt) => {
        if (!expiresAt) {
            return "Never";
        }

        const expiryDate =
            new Date(expiresAt);

        if (
            expiryDate <= new Date()
        ) {
            return "Expired";
        }

        return expiryDate.toLocaleString();
    };

    // ===============================
    // Check Expiration
    // ===============================

    const isExpired = (expiresAt) => {
        if (!expiresAt) {
            return false;
        }

        return (
            new Date(expiresAt) <=
            new Date()
        );
    };

    // ===============================
    // Filter URLs
    // ===============================

    const filteredUrls =
        urls.filter((item) => {
            const search =
                searchTerm
                    .toLowerCase()
                    .trim();

            const matchesSearch =
                !search ||
                item.shortCode
                    .toLowerCase()
                    .includes(search) ||
                item.originalUrl
                    .toLowerCase()
                    .includes(search);

            const expired =
                isExpired(
                    item.expiresAt
                );

            const matchesFilter =
                filterStatus === "all"
                    ? true
                    : filterStatus === "active"
                    ? !expired
                    : expired;

            return (
                matchesSearch &&
                matchesFilter
            );
        });

    // ===============================
    // Chart Helpers
    // ===============================

    const dailyClicks =
        analytics.dailyClicks || [];

    const maxDailyClicks =
        Math.max(
            ...dailyClicks.map(
                (item) => item.clicks || 0
            ),
            1
        );

    const getChartDate = (dateString) => {
        if (!dateString) {
            return "";
        }

        const date = new Date(
            `${dateString}T00:00:00`
        );

        return date.toLocaleDateString(
            undefined,
            {
                weekday: "short"
            }
        );
    };

    const chartWidth = 760;
    const chartHeight = 280;

    const chartPadding = {
        top: 25,
        right: 25,
        bottom: 45,
        left: 45
    };

    const chartInnerWidth =
        chartWidth -
        chartPadding.left -
        chartPadding.right;

    const chartInnerHeight =
        chartHeight -
        chartPadding.top -
        chartPadding.bottom;

    const chartPoints =
        dailyClicks.map(
            (item, index) => {
                const x =
                    dailyClicks.length === 1
                        ? chartWidth / 2
                        : chartPadding.left +
                          (index /
                              (dailyClicks.length -
                                  1)) *
                              chartInnerWidth;

                const y =
                    chartPadding.top +
                    chartInnerHeight -
                    ((item.clicks || 0) /
                        maxDailyClicks) *
                        chartInnerHeight;

                return {
                    ...item,
                    x,
                    y
                };
            }
        );

    const chartPolyline =
        chartPoints
            .map(
                (point) =>
                    `${point.x},${point.y}`
            )
            .join(" ");

    // ===============================
    // Authentication Screen
    // ===============================

    if (
        !isLoggedIn &&
        !isGuest
    ) {
        return (
            <div className="app auth-page">
                <div className="background-noise" />
                <div className="ambient ambient-one" />
                <div className="ambient ambient-two" />

                <div className="auth-container">
                    <div className="brand-mark auth-mark">
                        <span>URL\</span>
                    </div>

                    <div className="auth-heading">
                        <BlurText
                            text="URL Shortener"
                            delay={100}
                            animateBy="words"
                            direction="top"
                            className="auth-title"
                        />
                    </div>

                    <ShinyText
                        text="Shorten links. Share anywhere."
                        speed={3}
                        className="auth-shiny"
                    />

                    <p className="subtitle auth-subtitle">
                        Create clean, memorable links
                        without the clutter.
                    </p>

                    <BorderGlow className="auth-border">
                        <div className="auth-card">
                            <div className="auth-tabs">
                                <button
                                    className={
                                        authMode ===
                                        "login"
                                            ? "tab active"
                                            : "tab"
                                    }
                                    onClick={() => {
                                        setAuthMode(
                                            "login"
                                        );
                                        setAuthError("");
                                        setAuthMessage("");
                                    }}
                                >
                                    Login
                                </button>

                                <button
                                    className={
                                        authMode ===
                                        "register"
                                            ? "tab active"
                                            : "tab"
                                    }
                                    onClick={() => {
                                        setAuthMode(
                                            "register"
                                        );
                                        setAuthError("");
                                        setAuthMessage("");
                                    }}
                                >
                                    Register
                                </button>
                            </div>

                            <form
                                onSubmit={
                                    handleAuth
                                }
                            >
                                {authMode ===
                                    "register" && (
                                    <div className="field">
                                        <label>
                                            Name
                                        </label>

                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(
                                                e
                                            ) =>
                                                setName(
                                                    e.target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>
                                )}

                                <div className="field">
                                    <label>
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(
                                            e
                                        ) =>
                                            setEmail(
                                                e.target
                                                    .value
                                            )
                                        }
                                    />
                                </div>

                                <div className="field">
                                    <label>
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(
                                            e
                                        ) =>
                                            setPassword(
                                                e.target
                                                    .value
                                            )
                                        }
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="auth-button"
                                    disabled={
                                        authLoading
                                    }
                                >
                                    {authLoading
                                        ? "Please wait..."
                                        : authMode ===
                                          "login"
                                        ? "Login"
                                        : "Create Account"}
                                </button>
                            </form>

                            {authError && (
                                <div className="error">
                                    {authError}
                                </div>
                            )}

                            {authMessage && (
                                <div className="success">
                                    {authMessage}
                                </div>
                            )}
                        </div>
                    </BorderGlow>

                    <button
                        className="guest-button"
                        onClick={
                            handleGuestMode
                        }
                    >
                        Continue as Guest
                    </button>

                    <p className="footer-text">
                        Guest links expire after one hour.
                    </p>
                </div>
            </div>
        );
    }

    // ===============================
    // Dashboard
    // ===============================

    return (
        <div className="app dashboard-page">
            <div className="background-noise" />
            <div className="ambient ambient-one" />
            <div className="ambient ambient-two" />
            <div className="ambient ambient-three" />
            <div className="grid-overlay" />

            <div className="container">

                {/* Header */}

                <header className="dashboard-header">
                    <div className="brand-area">
                        <div className="brand-mark dashboard-mark">
                            <span>URL\</span>
                        </div>

                        <div className="brand-copy">
                            <ShinyText
                                text="URL Shortener"
                                speed={4}
                                className="brand-name"
                            />

                            <div className="hero-heading">
                                <BlurText
                                    text={
                                        isGuest
                                            ? "Create temporary links."
                                            : "Manage your links."
                                    }
                                    delay={100}
                                    animateBy="words"
                                    direction="top"
                                    className="dashboard-title"
                                />
                            </div>

                            <p className="subtitle">
                                {isGuest
                                    ? "Create a temporary short link without an account."
                                    : `Welcome back, ${user?.name}`}
                            </p>
                        </div>
                    </div>

                    {isGuest ? (
                        <button
                            className="logout-button"
                            onClick={() => {
                                setIsGuest(false);
                                setAuthMode("login");
                                setAuthError("");
                                setAuthMessage("");
                            }}
                        >
                            Login
                        </button>
                    ) : (
                        <button
                            className="logout-button"
                            onClick={
                                handleLogout
                            }
                        >
                            Logout
                        </button>
                    )}
                </header>

                {/* URL Creator */}

                <div className="creator-wrapper">
                    <SpotlightCard
                        className="creator-card"
                        spotlightColor="rgba(139, 92, 246, 0.18)"
                    >
                        <div className="creator-inner">
                            <div className="creator-header">
                                <span className="eyebrow">
                                    CREATE SHORT LINK
                                </span>

                                <h2>
                                    Turn long URLs into
                                    <span>
                                        {" "}clean links.
                                    </span>
                                </h2>

                                <p>
                                    Paste a URL below and
                                    create a shareable link
                                    in seconds.
                                </p>
                            </div>

                            <div className="input-section">
                                <div className="input-field-wrap main-input">
                                    <label>
                                        Destination URL
                                    </label>

                                    <input
                                        type="text"
                                        placeholder="https://example.com/your-long-url"
                                        value={url}
                                        onChange={(e) =>
                                            setUrl(
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div className="input-field-wrap">
                                    <label>
                                        Custom alias
                                    </label>

                                    <input
                                        type="text"
                                        placeholder="my-link"
                                        value={customAlias}
                                        onChange={(e) =>
                                            setCustomAlias(
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                {!isGuest && (
                                    <div className="input-field-wrap">
                                        <label>
                                            Expiration
                                        </label>

                                        <select
                                            value={
                                                expiration
                                            }
                                            onChange={(e) =>
                                                setExpiration(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Never expires
                                            </option>

                                            <option value="1h">
                                                1 hour
                                            </option>

                                            <option value="1d">
                                                1 day
                                            </option>

                                            <option value="7d">
                                                7 days
                                            </option>

                                            <option value="30d">
                                                30 days
                                            </option>
                                        </select>
                                    </div>
                                )}

                                <button
                                    className="shorten-button"
                                    onClick={
                                        handleShorten
                                    }
                                    disabled={loading}
                                >
                                    <span>
                                        {loading
                                            ? "Creating..."
                                            : "Shorten URL"}
                                    </span>

                                    <span className="button-arrow">
                                        →
                                    </span>
                                </button>

                                {isGuest && (
                                    <div className="guest-expiration">
                                        Guest links automatically
                                        expire after one hour.
                                    </div>
                                )}
                            </div>
                        </div>
                    </SpotlightCard>
                </div>

                {error && (
                    <div className="error dashboard-error">
                        {error}
                    </div>
                )}

                {/* Result */}

                {shortUrl && (
                    <BorderGlow className="result-border">
                        <div className="result">
                            <div className="result-heading">
                                <span className="status-dot" />

                                <span>
                                    Your link is ready
                                </span>
                            </div>

                            <div className="short-url-box">
                                <a
                                    href={shortUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {shortUrl}
                                </a>

                                <button
                                    onClick={
                                        copyShortUrl
                                    }
                                >
                                    Copy
                                </button>
                            </div>

                            {shortUrlExpiration && (
                                <p className="expiration">
                                    Expires:{" "}
                                    {formatExpiration(
                                        shortUrlExpiration
                                    )}
                                </p>
                            )}

                            <div className="qr-section">
                                <div className="qr-copy">
                                    <h3>
                                        Scan to open
                                    </h3>

                                    <p>
                                        Save or share this
                                        QR code anywhere.
                                    </p>
                                </div>

                                <div className="qr-box">
                                    <QRCodeCanvas
                                        id="short-url-qr"
                                        value={shortUrl}
                                        size={220}
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                        level="H"
                                    />
                                </div>

                                <button
                                    className="download-qr"
                                    onClick={
                                        downloadQRCode
                                    }
                                >
                                    Download QR
                                </button>
                            </div>
                        </div>
                    </BorderGlow>
                )}

                {/* Registered Dashboard */}

                {!isGuest && (
                    <div className="dashboard">

                        {/* ===============================
                            Analytics
                        =============================== */}

                        <section className="analytics-section">

                            <div className="section-heading analytics-heading">
                                <div>
                                    <span className="eyebrow">
                                        ANALYTICS
                                    </span>

                                    <h2>
                                        Your performance
                                    </h2>

                                    <p>
                                        Track your links and
                                        see how they perform.
                                    </p>
                                </div>

                                <button
                                    className="analytics-refresh"
                                    onClick={
                                        fetchAnalytics
                                    }
                                    disabled={
                                        analyticsLoading
                                    }
                                >
                                    {analyticsLoading
                                        ? "Refreshing..."
                                        : "Refresh"}
                                </button>
                            </div>

                            <div className="analytics-grid">

                                {/* Total Links */}

                                <SpotlightCard
                                    className="analytics-card"
                                    spotlightColor="rgba(139, 92, 246, 0.14)"
                                >
                                    <div className="analytics-card-inner">
                                        <span className="analytics-label">
                                            TOTAL LINKS
                                        </span>

                                        <strong className="analytics-value">
                                            {
                                                analytics.totalLinks
                                            }
                                        </strong>

                                        <span className="analytics-description">
                                            Links created
                                        </span>
                                    </div>
                                </SpotlightCard>

                                {/* Total Clicks */}

                                <SpotlightCard
                                    className="analytics-card"
                                    spotlightColor="rgba(59, 130, 246, 0.14)"
                                >
                                    <div className="analytics-card-inner">
                                        <span className="analytics-label">
                                            TOTAL CLICKS
                                        </span>

                                        <strong className="analytics-value">
                                            {
                                                analytics.totalClicks
                                            }
                                        </strong>

                                        <span className="analytics-description">
                                            Total redirects
                                        </span>
                                    </div>
                                </SpotlightCard>

                                {/* Clicks Today */}

                                <SpotlightCard
                                    className="analytics-card"
                                    spotlightColor="rgba(168, 85, 247, 0.14)"
                                >
                                    <div className="analytics-card-inner">
                                        <span className="analytics-label">
                                            CLICKS TODAY
                                        </span>

                                        <strong className="analytics-value">
                                            {
                                                analytics.clicksToday
                                            }
                                        </strong>

                                        <span className="analytics-description">
                                            Today's redirects
                                        </span>
                                    </div>
                                </SpotlightCard>

                                {/* Active Links */}

                                <SpotlightCard
                                    className="analytics-card"
                                    spotlightColor="rgba(34, 197, 94, 0.12)"
                                >
                                    <div className="analytics-card-inner">
                                        <span className="analytics-label">
                                            ACTIVE LINKS
                                        </span>

                                        <strong className="analytics-value">
                                            {
                                                analytics.activeLinks
                                            }
                                        </strong>

                                        <span className="analytics-description">
                                            Currently available
                                        </span>
                                    </div>
                                </SpotlightCard>

                                {/* Average Clicks */}

                                <SpotlightCard
                                    className="analytics-card analytics-average"
                                    spotlightColor="rgba(236, 72, 153, 0.12)"
                                >
                                    <div className="analytics-card-inner">
                                        <span className="analytics-label">
                                            AVERAGE CLICKS
                                        </span>

                                        <strong className="analytics-value">
                                            {
                                                analytics.averageClicks
                                            }
                                        </strong>

                                        <span className="analytics-description">
                                            Clicks per link
                                        </span>
                                    </div>
                                </SpotlightCard>

                                {/* Expired Links */}

                                <SpotlightCard
                                    className="analytics-card"
                                    spotlightColor="rgba(239, 68, 68, 0.12)"
                                >
                                    <div className="analytics-card-inner">
                                        <span className="analytics-label">
                                            EXPIRED LINKS
                                        </span>

                                        <strong className="analytics-value">
                                            {
                                                analytics.expiredLinks
                                            }
                                        </strong>

                                        <span className="analytics-description">
                                            No longer active
                                        </span>
                                    </div>
                                </SpotlightCard>

                            </div>
                        </section>

                        {/* ===============================
                            7 Day Click Activity
                        =============================== */}

                        <section className="click-activity-section">

                            <div className="section-heading">
                                <div>
                                    <span className="eyebrow">
                                        CLICK ACTIVITY
                                    </span>

                                    <h2>
                                        Last 7 days
                                    </h2>

                                    <p>
                                        Daily clicks across
                                        all your shortened links.
                                    </p>
                                </div>

                                <div className="click-activity-total">
                                    <strong>
                                        {dailyClicks.reduce(
                                            (
                                                total,
                                                item
                                            ) =>
                                                total +
                                                (item.clicks ||
                                                    0),
                                            0
                                        )}
                                    </strong>

                                    <span>
                                        7 DAY CLICKS
                                    </span>
                                </div>
                            </div>

                            <SpotlightCard
                                className="click-chart-card"
                                spotlightColor="rgba(139, 92, 246, 0.14)"
                            >
                                <div className="click-chart-wrapper">

                                    {dailyClicks.length ===
                                    0 ? (
                                        <div className="analytics-empty">
                                            <div className="empty-icon">
                                                /
                                            </div>

                                            <h3>
                                                No click activity yet.
                                            </h3>

                                            <p>
                                                Share your short links
                                                to start collecting
                                                click data.
                                            </p>
                                        </div>
                                    ) : (
                                        <svg
                                            className="click-chart"
                                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                            preserveAspectRatio="none"
                                            role="img"
                                            aria-label="Clicks over the last 7 days"
                                        >
                                            {/* Guide lines */}

                                            {[0, 1, 2, 3].map(
                                                (line) => {
                                                    const y =
                                                        chartPadding.top +
                                                        (line /
                                                            3) *
                                                            chartInnerHeight;

                                                    return (
                                                        <line
                                                            key={line}
                                                            x1={
                                                                chartPadding.left
                                                            }
                                                            y1={y}
                                                            x2={
                                                                chartWidth -
                                                                chartPadding.right
                                                            }
                                                            y2={y}
                                                            stroke="rgba(255,255,255,0.07)"
                                                            strokeWidth="1"
                                                        />
                                                    );
                                                }
                                            )}

                                            {/* Area */}

                                            {chartPoints.length >
                                                1 && (
                                                <polygon
                                                    points={[
                                                        `${chartPoints[0].x},${chartHeight - chartPadding.bottom}`,
                                                        ...chartPoints.map(
                                                            (
                                                                point
                                                            ) =>
                                                                `${point.x},${point.y}`
                                                        ),
                                                        `${chartPoints[
                                                            chartPoints.length -
                                                                1
                                                        ].x},${chartHeight - chartPadding.bottom}`
                                                    ].join(
                                                        " "
                                                    )}
                                                    fill="rgba(139, 92, 246, 0.08)"
                                                />
                                            )}

                                            {/* Line */}

                                            {chartPoints.length >
                                                1 && (
                                                <polyline
                                                    points={
                                                        chartPolyline
                                                    }
                                                    fill="none"
                                                    stroke="#8b5cf6"
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}

                                            {/* Points */}

                                            {chartPoints.map(
                                                (
                                                    point,
                                                    index
                                                ) => (
                                                    <g
                                                        key={
                                                            point.date ||
                                                            index
                                                        }
                                                    >
                                                        <circle
                                                            cx={
                                                                point.x
                                                            }
                                                            cy={
                                                                point.y
                                                            }
                                                            r="7"
                                                            fill="#050507"
                                                            stroke="#8b5cf6"
                                                            strokeWidth="3"
                                                        />

                                                        <text
                                                            x={
                                                                point.x
                                                            }
                                                            y={
                                                                point.y -
                                                                15
                                                            }
                                                            textAnchor="middle"
                                                            fill="rgba(255,255,255,0.72)"
                                                            fontSize="12"
                                                            fontWeight="600"
                                                        >
                                                            {
                                                                point.clicks
                                                            }
                                                        </text>

                                                        <text
                                                            x={
                                                                point.x
                                                            }
                                                            y={
                                                                chartHeight -
                                                                16
                                                            }
                                                            textAnchor="middle"
                                                            fill="rgba(255,255,255,0.38)"
                                                            fontSize="11"
                                                        >
                                                            {getChartDate(
                                                                point.date
                                                            )}
                                                        </text>
                                                    </g>
                                                )
                                            )}
                                        </svg>
                                    )}

                                </div>
                            </SpotlightCard>
                        </section>

                        {/* ===============================
                            Top Performing Links
                        =============================== */}

                        <section className="top-links-section">

                            <div className="section-heading">
                                <div>
                                    <span className="eyebrow">
                                        PERFORMANCE
                                    </span>

                                    <h2>
                                        Top performing links
                                    </h2>

                                    <p>
                                        Your most-clicked shortened
                                        URLs.
                                    </p>
                                </div>
                            </div>

                            {analytics.topLinks.length ===
                            0 ? (
                                <div className="empty analytics-empty">
                                    <div className="empty-icon">
                                        /
                                    </div>

                                    <h3>
                                        No analytics yet.
                                    </h3>

                                    <p>
                                        Create and share a
                                        short link to start
                                        collecting clicks.
                                    </p>
                                </div>
                            ) : (
                                <div className="top-links-list">
                                    {analytics.topLinks.map(
                                        (
                                            item,
                                            index
                                        ) => (
                                            <SpotlightCard
                                                key={
                                                    item.id
                                                }
                                                className="top-link-card"
                                                spotlightColor="rgba(139, 92, 246, 0.10)"
                                            >
                                                <div className="top-link-content">

                                                    <div className="top-link-rank">
                                                        {String(
                                                            index +
                                                                1
                                                        ).padStart(
                                                            2,
                                                            "0"
                                                        )}
                                                    </div>

                                                    <div className="top-link-info">
                                                        <a
                                                            href={`${API_URL}/${item.shortCode}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {API_URL}/
                                                            {
                                                                item.shortCode
                                                            }
                                                        </a>

                                                        <p>
                                                            {
                                                                item.originalUrl
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="top-link-clicks">
                                                        <strong>
                                                            {
                                                                item.clicks
                                                            }
                                                        </strong>

                                                        <span>
                                                            clicks
                                                        </span>
                                                    </div>

                                                </div>
                                            </SpotlightCard>
                                        )
                                    )}
                                </div>
                            )}
                        </section>

                        {/* ===============================
                            URL History
                        =============================== */}

                        <section className="url-history-section">

                            <div className="section-heading">
                                <div>
                                    <span className="eyebrow">
                                        YOUR WORKSPACE
                                    </span>

                                    <h2>
                                        Your URLs
                                    </h2>

                                    <p>
                                        Manage and track all
                                        your shortened links.
                                    </p>
                                </div>

                                <div className="url-count">
                                    {urls.length}

                                    <span>
                                        total
                                    </span>
                                </div>
                            </div>

                            <div className="url-controls">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by URL or alias..."
                                    value={
                                        searchTerm
                                    }
                                    onChange={(e) =>
                                        setSearchTerm(
                                            e.target.value
                                        )
                                    }
                                />

                                <select
                                    className="filter-select"
                                    value={
                                        filterStatus
                                    }
                                    onChange={(e) =>
                                        setFilterStatus(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="all">
                                        All URLs
                                    </option>

                                    <option value="active">
                                        Active
                                    </option>

                                    <option value="expired">
                                        Expired
                                    </option>
                                </select>
                            </div>

                            {filteredUrls.length ===
                            0 ? (
                                <div className="empty">
                                    <div className="empty-icon">
                                        /
                                    </div>

                                    <h3>
                                        {urls.length ===
                                        0
                                            ? "No shortened URLs yet."
                                            : "No matching URLs."}
                                    </h3>

                                    <p>
                                        {urls.length ===
                                        0
                                            ? "Create your first short link above."
                                            : "Try changing your search or filter."}
                                    </p>
                                </div>
                            ) : (
                                <div className="url-list">
                                    {filteredUrls.map(
                                        (item) => (
                                            <SpotlightCard
                                                key={
                                                    item._id
                                                }
                                                className="url-card"
                                                spotlightColor="rgba(139, 92, 246, 0.10)"
                                            >
                                                <div className="url-card-content">

                                                    <div className="url-info">
                                                        <a
                                                            href={`${API_URL}/${item.shortCode}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {API_URL}/
                                                            {
                                                                item.shortCode
                                                            }
                                                        </a>

                                                        <p>
                                                            {
                                                                item.originalUrl
                                                            }
                                                        </p>

                                                        <span className="expiration">
                                                            Expires:{" "}
                                                            {formatExpiration(
                                                                item.expiresAt
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="clicks">
                                                        <strong>
                                                            {
                                                                item.clicks
                                                            }
                                                        </strong>

                                                        <span>
                                                            Clicks
                                                        </span>
                                                    </div>

                                                    <button
                                                        className="delete-button"
                                                        onClick={() =>
                                                            handleDelete(
                                                                item._id
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>
                                            </SpotlightCard>
                                        )
                                    )}
                                </div>
                            )}
                        </section>

                    </div>
                )}
            </div>
        </div>
    );
}

export default App;