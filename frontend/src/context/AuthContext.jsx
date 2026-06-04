import { createContext, useContext, useMemo, useState } from "react";
import { ROLE_HOME } from "../constants/roles";

const AuthContext = createContext(null);

const readStoredUser = () => {
    try {
        const raw = localStorage.getItem("studyhub_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readStoredUser);
    const [token, setToken] = useState(
        () => localStorage.getItem("studyhub_token")
    );

    const loginSession = (nextToken, nextUser) => {
        localStorage.setItem("studyhub_token", nextToken);
        localStorage.setItem("studyhub_user", JSON.stringify(nextUser));
        setToken(nextToken);
        setUser(nextUser);
    };

    const logout = () => {
        localStorage.removeItem("studyhub_token");
        localStorage.removeItem("studyhub_user");
        setToken(null);
        setUser(null);
    };

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated: Boolean(token && user),
            loginSession,
            logout,
            homePath: user ? ROLE_HOME[user.role] : "/login"
        }),
        [user, token]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }

    return context;
}
