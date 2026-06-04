import styles from "./Tabs.module.css";

export default function Tabs({ tabs, activeTab, onChange }) {
    return (
        <div className={styles.tabs} role="tablist" aria-label="Sections">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`${styles.tab}${isActive ? ` ${styles.tabActive}` : ""}`}
                        onClick={() => onChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
