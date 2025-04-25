import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./styles.css";

function DoctorListingApp() {
  // States
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [consultationType, setConsultationType] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [sortBy, setSortBy] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const navigate = useNavigate();
  const location = useLocation();
  const getSpecialtyTestId = (specialty) => {
    // Create a mapping for specialties that might need special handling
    const specialtyMapping = {
      "Dietitian/Nutritionist": "Dietitian-Nutritionist",
      // Add more mappings as needed
    };

    // Use the mapping if available, otherwise replace / with - as in your original code
    const formattedSpecialty =
      specialtyMapping[specialty] || specialty.replace(/\//g, "-");
    return `filter-specialty-${formattedSpecialty}`;
  };

  // Fetch doctors data from the API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch(
          "https://srijandubey.github.io/campus-api-mock/SRM-C1-25.json"
        );
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setDoctors(data);
        console.log("Sample doctor data:", data.slice(0, 3));
        console.log("Consultation modes:", [
          ...new Set(data.map((d) => d.consultation_mode)),
        ]);

        // Extract unique specialties from the data
        const allSpecialties = new Set();
        data.forEach((doctor) => {
          if (doctor.specialities && Array.isArray(doctor.specialities)) {
            doctor.specialities.forEach((spec) => {
              if (spec && spec.name) allSpecialties.add(spec.name);
            });
          }
        });
        setSpecialties(Array.from(allSpecialties).sort());
        console.log(
          "All specialities extracted:",
          Array.from(allSpecialties).sort()
        );

        setLoading(false);
      } catch (error) {
        console.error("Error fetching doctor data:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // Parse query parameters on mount and when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const search = params.get("search") || "";
    const consult = params.get("consultation") || "";
    const specialties = params.getAll("specialty") || [];
    const sort = params.get("sort") || "";

    setSearchTerm(search);
    setConsultationType(consult);
    setSelectedSpecialties(specialties);
    setSortBy(sort);
  }, [location.search]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchTerm) params.append("search", searchTerm);
    if (consultationType) params.append("consultation", consultationType);
    selectedSpecialties.forEach((specialty) =>
      params.append("specialty", specialty)
    );
    if (sortBy) params.append("sort", sortBy);

    const queryString = params.toString();
    navigate(`?${queryString}`, { replace: true });
  }, [searchTerm, consultationType, selectedSpecialties, sortBy, navigate]);

  // Generate search suggestions based on input
  useEffect(() => {
    if (searchTerm.length > 0) {
      const filteredDoctors = doctors.filter(
        (doctor) =>
          doctor.name &&
          doctor.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setSearchSuggestions(
        filteredDoctors.slice(0, 3).map((doctor) => doctor.name)
      );

      if (filteredDoctors.length > 0) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, doctors]);

  // Filter specialties based on search term
  const filteredSpecialties = useMemo(() => {
    if (!specialtySearchTerm) return specialties;
    return specialties.filter((specialty) =>
      specialty.toLowerCase().includes(specialtySearchTerm.toLowerCase())
    );
  }, [specialties, specialtySearchTerm]);

  const filteredDoctors = useMemo(() => {
    if (!doctors.length) return [];

    return doctors
      .filter((doctor) => {
        // Filter by search term
        if (
          searchTerm &&
          (!doctor.name ||
            !doctor.name.toLowerCase().includes(searchTerm.toLowerCase()))
        ) {
          return false;
        }

        // Filter by consultation type
        if (consultationType === "Video Consult" && !doctor.video_consult) {
          return false;
        }
        if (consultationType === "In Clinic" && !doctor.in_clinic) {
          return false;
        }

        // Filter by specialties
        if (selectedSpecialties.length > 0) {
          // Check if doctor has any of the selected specialties
          const doctorSpecialities = doctor.specialities || [];

          // This is the fixed part - we want to return true if the doctor has ANY of the selected specialties
          const hasAnySelectedSpecialty = selectedSpecialties.some(
            (selectedSpecialty) => {
              return doctorSpecialities.some(
                (docSpeciality) =>
                  docSpeciality && docSpeciality.name === selectedSpecialty
              );
            }
          );

          if (!hasAnySelectedSpecialty) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "fees") {
          // Extract numeric part from fees string (remove currency symbol and spaces)
          const feeA = a.fees ? parseInt(a.fees.replace(/[^0-9]/g, ""), 10) : 0;
          const feeB = b.fees ? parseInt(b.fees.replace(/[^0-9]/g, ""), 10) : 0;
          return feeA - feeB; // ascending
        } else if (sortBy === "experience") {
          // Extract years from experience string
          const expA = a.experience
            ? parseInt(a.experience.match(/\d+/)[0] || 0, 10)
            : 0;
          const expB = b.experience
            ? parseInt(b.experience.match(/\d+/)[0] || 0, 10)
            : 0;
          return expB - expA; // descending
        }
        return 0;
      });
  }, [doctors, searchTerm, consultationType, selectedSpecialties, sortBy]);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setActiveSuggestionIndex(-1); // Reset active suggestion when typing
  };

  // Handle keyboard navigation for suggestions
  const handleSearchKeyDown = (e) => {
    // Arrow down
    if (e.keyCode === 40 && showSuggestions && searchSuggestions.length > 0) {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    }
    // Arrow up
    else if (
      e.keyCode === 38 &&
      showSuggestions &&
      searchSuggestions.length > 0
    ) {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    }
    // Enter
    else if (
      e.keyCode === 13 &&
      activeSuggestionIndex >= 0 &&
      searchSuggestions.length > 0
    ) {
      e.preventDefault();
      handleSuggestionClick(searchSuggestions[activeSuggestionIndex]);
    }
    // Escape
    else if (e.keyCode === 27 && showSuggestions) {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  // Handle specialty search
  const handleSpecialtySearch = (e) => {
    setSpecialtySearchTerm(e.target.value);
  };

  // Handle search suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
  };

  // Handle consultation type change
  const handleConsultationChange = (value) => {
    setConsultationType(value === consultationType ? "" : value);
  };

  // Handle specialty selection
  const handleSpecialtyChange = (specialty) => {
    setSelectedSpecialties((prev) => {
      if (prev.includes(specialty)) {
        return prev.filter((item) => item !== specialty);
      } else {
        return [...prev, specialty];
      }
    });
  };

  // Handle sort option change
  const handleSortChange = (value) => {
    setSortBy(value === sortBy ? "" : value);
  };

  // Handle clear all filters
  const handleClearAll = () => {
    setSearchTerm("");
    setConsultationType("");
    setSelectedSpecialties([]);
    setSortBy("");
    setSpecialtySearchTerm("");
  };

  // Handle blur for search input to close suggestions after delay
  const handleSearchBlur = () => {
    // Short delay to allow clicking on a suggestion
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Handle focus for search input
  const handleSearchFocus = () => {
    if (searchTerm && searchSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="app">
      {/* Autocomplete Header */}
      <header className="header">
        <div className="search-container">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onBlur={handleSearchBlur}
              onFocus={handleSearchFocus}
              placeholder="Search Symptoms, Doctors, Specialists, Clinics"
              className="search-input"
              data-testid="autocomplete-input"
            />
            <button type="submit" className="search-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>

          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="suggestions-dropdown" role="listbox">
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`suggestion-item ${
                    index === activeSuggestionIndex ? "active-suggestion" : ""
                  }`}
                  data-testid="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="main-content">
        {/* Filter Panel */}
        <aside className="filter-panel">
          {/* Sort Filter */}
          <div className="filter-section">
            <div className="filter-header">
              <h3 data-testid="filter-header-sort">Sort by</h3>
              <svg
                className="chevron-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div className="filter-options">
              <label className="filter-option">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "fees"}
                  onChange={() => handleSortChange("fees")}
                  data-testid="sort-fees"
                />
                <span>Price: Low-High</span>
              </label>
              <label className="filter-option">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "experience"}
                  onChange={() => handleSortChange("experience")}
                  data-testid="sort-experience"
                />
                <span>Experience: Most Experience first</span>
              </label>
            </div>
          </div>

          <div className="filters-header">
            <h3>Filters</h3>
            {(searchTerm ||
              consultationType ||
              selectedSpecialties.length > 0 ||
              sortBy ||
              specialtySearchTerm) && (
              <button className="clear-all" onClick={handleClearAll}>
                Clear All
              </button>
            )}
          </div>

          {/* Specialties Filter */}
          <div className="filter-section">
            <div className="filter-header">
              <h3 data-testid="filter-header-speciality">Specialities</h3>
              <svg
                className="chevron-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div className="filter-search">
              <input
                type="text"
                placeholder="Search specialities"
                className="specialty-search"
                value={specialtySearchTerm}
                onChange={handleSpecialtySearch}
              />
            </div>
            <div className="filter-options specialty-options">
              {filteredSpecialties.map((specialty) => (
                <label key={specialty} className="filter-option">
                  <input
                    type="checkbox"
                    checked={selectedSpecialties.includes(specialty)}
                    onChange={() => handleSpecialtyChange(specialty)}
                    data-testid={getSpecialtyTestId(specialty)}
                  />
                  <span>{specialty}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Consultation Type Filter */}
          <div className="filter-section">
            <div className="filter-header">
              <h3 data-testid="filter-header-moc">Mode of consultation</h3>
              <svg
                className="chevron-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div className="filter-options">
              <label className="filter-option">
                <input
                  type="radio"
                  name="consultation"
                  checked={consultationType === "Video Consult"}
                  onChange={() => handleConsultationChange("Video Consult")}
                  data-testid="filter-video-consult"
                />
                <span>Video Consultation</span>
              </label>
              <label className="filter-option">
                <input
                  type="radio"
                  name="consultation"
                  checked={consultationType === "In Clinic"}
                  onChange={() => handleConsultationChange("In Clinic")}
                  data-testid="filter-in-clinic"
                />
                <span>In-clinic Consultation</span>
              </label>
              <label className="filter-option">
                <input
                  type="radio"
                  name="consultation"
                  checked={consultationType === ""}
                  onChange={() => setConsultationType("")}
                />
                <span>All</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Doctor List */}
        <main className="doctor-list">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor, index) => (
              <div
                key={doctor.id || index}
                className="doctor-card"
                data-testid="doctor-card"
              >
                <div
                  key={doctor.id || index}
                  className="doctor-card"
                  data-testid="doctor-card"
                >
                  <div className="doctor-avatar">
                    <img
                      src={
                        doctor.image || doctor.photo || "/api/placeholder/80/80"
                      }
                      alt={`Dr. ${doctor.name}`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23cccccc'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' text-anchor='middle' dominant-baseline='middle' fill='%23666666'%3ENo Image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="doctor-info">
                    <h2 data-testid="doctor-name">Dr. {doctor.name}</h2>

                    {/* Display all specialties */}
                    <p
                      className="doctor-qualifications"
                      data-testid="doctor-specialty"
                    >
                      {doctor.specialities &&
                      Array.isArray(doctor.specialities) &&
                      doctor.specialities.length > 0
                        ? doctor.specialities
                            .map((spec) => spec.name)
                            .join(", ")
                        : "General Physician"}
                    </p>

                    <p className="doctor-education">
                      {doctor.qualification || "MBBS"}
                      {doctor.qualification_details
                        ? `, ${doctor.qualification_details}`
                        : ""}
                    </p>

                    <p
                      className="doctor-experience"
                      data-testid="doctor-experience"
                    >
                      {doctor.experience}
                    </p>

                    {/* Add consultation modes */}
                    <div className="doctor-consultation-modes">
                      {doctor.video_consult && (
                        <span className="consult-mode video">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect
                              x="1"
                              y="5"
                              width="15"
                              height="14"
                              rx="2"
                              ry="2"
                            ></rect>
                          </svg>
                          Video Consult
                        </span>
                      )}
                      {doctor.in_clinic && (
                        <span className="consult-mode clinic">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                          </svg>
                          In-Clinic
                        </span>
                      )}
                    </div>

                    <div className="doctor-clinic">
                      <div className="clinic-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          ></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                      </div>
                      <span>
                        {(doctor.clinic && doctor.clinic.name) ||
                          "Private Clinic"}
                      </span>
                    </div>

                    <div className="doctor-location">
                      <div className="location-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </div>
                      <span>
                        {(doctor.clinic &&
                          doctor.clinic.address &&
                          doctor.clinic.address.locality) ||
                          "Local Area"}
                      </span>
                    </div>
                  </div>

                  <div className="doctor-fee-section">
                    <div className="doctor-fee" data-testid="doctor-fee">
                      {doctor.fees}
                    </div>
                    <button className="book-appointment">
                      Book Appointment
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              No doctors match your search criteria.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default DoctorListingApp;
