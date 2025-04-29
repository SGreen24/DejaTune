// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './components/index.css';
import App from './App';
import SignUp from './components/Auth/Signup';
import Login from './components/Auth/Login';
import Guest from './components/Auth/Guest';
import Home from './components/Home/Home';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/guest" element={<Guest />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  </StrictMode>
);
