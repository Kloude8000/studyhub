import styles from "./Button.module.css";

const VARIANTS = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    ghost: styles.btnGhost,
    danger: styles.btnDanger
};

export default function Button({
    children,
    variant = "primary",
    block = false,
    small = false,
    className = "",
    ...props
}) {
    const classes = [
        styles.btn,
        VARIANTS[variant] || VARIANTS.primary,
        block ? styles.btnBlock : "",
        small ? styles.btnSmall : "",
        className
    ].filter(Boolean).join(" ");

    return (
        <button className={classes} {...props}>
            {children}
        </button>
    );
}
