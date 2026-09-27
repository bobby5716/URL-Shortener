import { useEffect, useRef } from "react";
import "./SpotlightCard.css";

function SpotlightCard({
    children,
    className = "",
    spotlightColor = "rgba(139, 92, 246, 0.18)",
}) {
    const cardRef = useRef(null);

    useEffect(() => {
        const card = cardRef.current;

        if (!card) return;

        const handleMove = (event) => {
            const rect = card.getBoundingClientRect();

            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            card.style.setProperty("--spotlight-x", `${x}px`);
            card.style.setProperty("--spotlight-y", `${y}px`);
        };

        card.addEventListener("pointermove", handleMove);

        return () => {
            card.removeEventListener("pointermove", handleMove);
        };
    }, []);

    return (
        <div
            ref={cardRef}
            className={`spotlight-card ${className}`}
            style={{
                "--spotlight-color": spotlightColor,
            }}
        >
            <div className="spotlight-card-content">
                {children}
            </div>
        </div>
    );
}

export default SpotlightCard;