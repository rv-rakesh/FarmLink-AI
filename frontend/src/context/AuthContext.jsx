import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("fl_user");

    if (!raw || raw === "undefined" || raw === "null") {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem("fl_user");
      return null;
    }
  });

  const [token, setTok] = useState(() => {
    const raw = localStorage.getItem("fl_token");

    if (!raw || raw === "undefined" || raw === "null") {
      return null;
    }

    return raw;
  });

  useEffect(() => {
    setToken(token);
  }, [token]);

  const login = async (payload) => {
    const { data } = await api.post("/api/auth/login", payload);

    setTok(data.token);
    setUser(data.user);

    localStorage.setItem("fl_token", data.token);
    localStorage.setItem("fl_user", JSON.stringify(data.user));

    setToken(data.token);

    return data.user;
  };

  const signup = async (payload) => {
    const { data } = await api.post("/api/auth/signup", payload);

    setTok(data.token);
    setUser(data.user);

    localStorage.setItem("fl_token", data.token);
    localStorage.setItem("fl_user", JSON.stringify(data.user));

    setToken(data.token);

    return data.user;
  };

  const logout = () => {
    setTok(null);
    setUser(null);

    localStorage.removeItem("fl_token");
    localStorage.removeItem("fl_user");

    setToken(null);
  };

  const refreshUser = (next) => {
    setUser(next);
    localStorage.setItem("fl_user", JSON.stringify(next));
  };

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get("/api/auth/me");

      if (data?.user) {
        setUser(data.user);
        localStorage.setItem("fl_user", JSON.stringify(data.user));
        return data.user;
      }
    } catch (e) {
      // Ignore authentication refresh errors
    }

    return null;
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      signup,
      logout,
      refreshUser,
      fetchCurrentUser,
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
  return useContext(AuthContext);
}
