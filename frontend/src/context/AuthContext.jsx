import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('intellitask_token'));
  const [loading, setLoading] = useState(true);

  // Set axios default auth header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // On mount, verify token and fetch user profile
  useEffect(() => {
    const bootstrap = async () => {
      if (token) {
        try {
          const { data } = await axios.get('/api/auth/me');
          setUser(data);
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    bootstrap();
  }, []); // eslint-disable-line

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('intellitask_token', data.token);
    setToken(data.token);
    setUser({ _id: data._id, username: data.username, email: data.email });
    return data;
  };

  const register = async (username, email, password) => {
    const { data } = await axios.post('/api/auth/register', { username, email, password });
    localStorage.setItem('intellitask_token', data.token);
    setToken(data.token);
    setUser({ _id: data._id, username: data.username, email: data.email });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('intellitask_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
