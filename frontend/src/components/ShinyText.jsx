import "./ShinyText.css";

function ShinyText({
    children,
    className = "",
}) {
    return (
        <span className={`shiny-text ${className}`}>
            {children}
        </span>
    );
}

export default ShinyText;