// App.jsx


import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DoctorListingApp from "./DoctorListingApp";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DoctorListingApp />} />
      </Routes>
    </Router>
  );
}

export default App;

// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
