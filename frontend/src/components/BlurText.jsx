import { useEffect, useState } from "react";
import "./BlurText.css";

function BlurText({
    text,
    className = "",
    delay = 45,
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(true);
        }, 80);

        return () => clearTimeout(timer);
    }, []);

    return (
        <span className={`blur-text ${visible ? "blur-text-visible" : ""} ${className}`}>
            {text.split(" ").map((word, index) => (
                <span
                    className="blur-text-word"
                    key={`${word}-${index}`}
                    style={{
                        transitionDelay: `${index * delay}ms`,
                    }}
                >
                    {word}
                    {index < text.split(" ").length - 1 ? "\u00A0" : ""}
                </span>
            ))}
        </span>
    );
}

export default BlurText;