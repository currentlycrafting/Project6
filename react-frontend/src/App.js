import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // Assuming App.css is in the same directory

// IMPORTANT: Ensure this URL matches where your FastAPI backend is running.
const API_BASE_URL = 'http://127.0.0.1:8000';

function App() {
  // State to manage the current view/page in the application.
  // Possible values: 'list', 'create', 'view', 'edit', 'ml'
  const [currentPage, setCurrentPage] = useState('list');
  // State to hold the list of pages fetched from the backend.
  const [pages, setPages] = useState([]);
  // State to hold the ID of the page currently being viewed or edited.
  const [selectedPageId, setSelectedPageId] = useState(null);
  // State to manage loading status for API calls.
  const [loading, setLoading] = useState(false);
  // State for displaying error messages to the user.
  const [error, setError] = useState(null);

  // Helper function for fetching with retry logic
  const retryFetch = useCallback(async (url, options = {}, retries = 3, interval = 500) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempt ${i + 1} to fetch: ${url}`);
        const response = await fetch(url, options);
        if (response.ok) {
          return response;
        } else if (response.status >= 500) { // Server errors might be temporary
          console.warn(`Server error ${response.status} on attempt ${i + 1}. Retrying...`);
        } else { // Client errors or unretriable server errors
          console.error(`Fetch failed with status ${response.status} on attempt ${i + 1}. No retry.`);
          return response; // Don't retry for non-server errors (e.g., 404, 400)
        }
      } catch (err) {
        console.error(`Network error on attempt ${i + 1}:`, err);
        if (i < retries - 1) {
          console.log(`Retrying in ${interval}ms...`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
  }, []);

  // Function to fetch all pages from the backend API. Wrapped in useCallback.
  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await retryFetch(`${API_BASE_URL}/pages/`); // Use retryFetch here
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status} - ${errorData.detail || response.statusText}`);
      }
      const data = await response.json();
      console.log("Received pages data for list:", data);
      setPages(data);
    } catch (err) {
      console.error("Failed to fetch pages:", err);
      setError("Failed to load pages. Please ensure the backend is running and accessible. Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, retryFetch]); // Dependency array for useCallback

  // Effect to fetch pages whenever the component mounts or the current page changes to 'list' or 'ml'.
  // 'ml' is added here because the MLPage component also needs the list of pages.
  useEffect(() => {
    if (currentPage === 'list' || currentPage === 'ml') {
      fetchPages();
    }
  }, [currentPage, fetchPages]);

  // Function to fetch a single page by its ID. Wrapped in useCallback.
  const fetchPageById = useCallback(async (id) => {
    setLoading(true); // This loading state is for the main App, individual components might have their own.
    setError(null);
    try {
      console.log(`Attempting to fetch page with ID: ${id}`);
      const response = await retryFetch(`${API_BASE_URL}/pages/${id}`); // Use retryFetch here
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status} - ${errorData.detail || response.statusText}`);
      }
      const data = await response.json();
      console.log(`Received data for page ${id}:`, data);
      // setLoading(false); // Removed here; individual PageView will manage its loading state
      return data;
    } catch (err) {
      console.error(`Failed to fetch page ${id}:`, err);
      setError(`Failed to load page details for ID ${id}. Error: ${err.message}.`);
      // setLoading(false); // Removed here; individual PageView will manage its loading state
      return null;
    } finally {
      // setLoading is not strictly needed here as PageView has its own loading management
    }
  }, [API_BASE_URL, retryFetch]); // Dependency array for useCallback

  // --- Page Management Handlers ---

  const handleViewPage = (id) => {
    setSelectedPageId(id);
    setCurrentPage('view');
  };

  const handleEditPage = (id) => {
    setSelectedPageId(id);
    setCurrentPage('edit');
  };

  const handleDeletePage = async (id) => {
    // IMPORTANT: window.confirm should be replaced with a custom modal/dialog component
    // as per platform instructions (avoiding browser native alerts in immersive environments).
    // Using a simple alert for now for quick demonstration purposes.
    if (!window.confirm("Are you sure you want to delete this page?")) {
      return; // If user cancels, do nothing
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/pages/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! Status: ${response.status} - ${errorData.detail || response.statusText}`);
      }
      fetchPages(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete page:", err);
      setError(`Failed to delete page: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  // --- Components for different views (defined within App to access state) ---

  // Component for listing all pages
  const PageList = () => {
    console.log("PageList rendering. Current pages state:", pages);

    if (loading) return <p className="loading-text">Loading pages...</p>;
    if (error) return (
      <div className="error-box" role="alert">
        <strong>Error!</strong>
        <span> {error}</span>
      </div>
    );

    return (
      <div className="message-list"> {/* Reusing message-list class for general list styling */}
        {pages.length === 0 ? (
          <p className="text-center italic empty-list-text">No pages yet. Start by creating a new one!</p>
        ) : (
          <ul>
            {pages.map((page) => (
              <li key={page.id} className="message-item page-item">
                <span className="message-text page-title">{page.title || "Untitled Page"}</span>
                <div className="message-actions">
                  <button onClick={() => handleViewPage(page.id)} className="button view-button">
                    View
                  </button>
                  <button onClick={() => handleEditPage(page.id)} className="button edit-button">
                    Edit
                  </button>
                  <button onClick={() => handleDeletePage(page.id)} className="button delete-button">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Component for creating or editing a page
  const PageForm = ({ pageId, onSave, onCancel }) => {
    const [pageTitle, setPageTitle] = useState('');
    const [pageContent, setPageContent] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    useEffect(() => {
      if (pageId) {
        const loadPage = async () => {
          setFormLoading(true);
          const page = await fetchPageById(pageId);
          if (page) {
            setPageTitle(page.title);
            setPageContent(page.content);
          }
          setFormLoading(false);
        };
        loadPage();
      } else {
        setPageTitle('');
        setPageContent('');
      }
      setFormError(null);
    }, [pageId, fetchPageById]);

    const handleSubmit = async () => {
      if (!pageTitle.trim() || !pageContent.trim()) {
        setFormError("Title and content cannot be empty.");
        return;
      }

      setFormLoading(true);
      setFormError(null);

      try {
        let response;
        const pageData = { title: pageTitle, content: pageContent };
        if (pageId) {
          response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pageData),
          });
        } else {
          response = await fetch(`${API_BASE_URL}/pages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pageData),
          });
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! Status: ${response.status} - ${errorData.detail || response.statusText}`);
        }
        onSave();
      } catch (err) {
        console.error("Failed to save page:", err);
        setFormError(`Failed to save page: ${err.message}.`);
      } finally {
        setFormLoading(false);
      }
    };

    return (
      <div className="card notebook-page form-page">
        <h2 className="card-title">{pageId ? "Edit Page" : "Create New Page"}</h2>
        {formError && (
          <div className="error-box" role="alert">
            <strong>Error!</strong>
            <span> {formError}</span>
          </div>
        )}
        <div className="input-group column-group">
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Page Title"
            className="input-field"
            disabled={formLoading}
          />
          <textarea
            value={pageContent}
            onChange={(e) => setPageContent(e.target.value)}
            placeholder="Write your page content here..."
            className="input-field textarea-field"
            rows="10"
            disabled={formLoading}
          ></textarea>
        </div>
        <div className="button-group">
          <button onClick={handleSubmit} className="button save-button" disabled={formLoading}>
            {pageId ? "Save Changes" : "Create Page"}
          </button>
          <button onClick={onCancel} className="button cancel-button" disabled={formLoading}>
            Cancel
          </button>
        </div>
        {formLoading && <p className="loading-text">Saving...</p>}
      </div>
    );
  };

  // Component for viewing a single page
  const PageView = ({ pageId, onEdit, onBack }) => {
    const [page, setPage] = useState(null);
    const [viewLoading, setViewLoading] = useState(true);
    const [viewError, setViewError] = useState(null);

    useEffect(() => {
      const loadPage = async () => {
        setViewLoading(true);
        setViewError(null);
        console.log(`PageView: Attempting to load page with ID: ${pageId}`);
        const fetchedPage = await fetchPageById(pageId);
        if (fetchedPage) {
          setPage(fetchedPage);
          console.log(`PageView: Successfully loaded page ${pageId}`);
        } else {
          setViewError(`Could not load page ${pageId}. It might have been deleted or an error occurred.`);
          console.error(`PageView: Failed to load page ${pageId}`);
        }
        setViewLoading(false);
      };
      loadPage();
    }, [pageId, fetchPageById]);

    if (viewLoading) return <p className="loading-text">Loading page details...</p>;
    if (viewError) return (
      <div className="error-box" role="alert">
        <strong>Error!</strong>
        <span> {viewError}</span>
        <button onClick={onBack} className="button back-button mt-4">Back to List</button>
      </div>
    );
    if (!page) return <p className="text-center italic empty-list-text">Page not found.</p>;

    return (
      <div className="card notebook-page view-page">
        <h2 className="card-title page-view-title">{page.title}</h2>
        <div className="page-content-display">
          <p>{page.content}</p>
        </div>
        <div className="button-group">
          <button onClick={() => onEdit(page.id)} className="button edit-button">
            Edit Page
          </button>
          <button onClick={onBack} className="button cancel-button">
            Back to List
          </button>
        </div>
      </div>
    );
  };

  // Component for Machine Learning (Sentiment Analysis) - UPDATED
  const MLPage = ({ onBack, pages, fetchPages }) => {
    const [selectedPageForAnalysis, setSelectedPageForAnalysis] = useState('');
    const [sentimentResult, setSentimentResult] = useState(null);
    const [mlLoading, setMlLoading] = useState(false);
    const [mlError, setMlError] = useState(null);
    const [analyzedPageContent, setAnalyzedPageContent] = useState('');

    // Fetch pages when the component mounts or if the pages list is empty
    useEffect(() => {
      if (pages.length === 0) {
        fetchPages();
      }
    }, [pages, fetchPages]);

    const analyzePageSentiment = async () => {
      if (!selectedPageForAnalysis) {
        setMlError("Please select a page to analyze sentiment.");
        return;
      }

      setMlLoading(true);
      setMlError(null);
      setSentimentResult(null);
      setAnalyzedPageContent(''); // Clear previous content

      try {
        const response = await fetch(`${API_BASE_URL}/analyze-page-sentiment/${selectedPageForAnalysis}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // No body needed as page_id is in the URL and backend fetches content
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! Status: ${response.status} - ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        setSentimentResult(data.sentiment);
        setAnalyzedPageContent(data.text_analyzed); // Store the actual text that was analyzed
      } catch (err) {
        console.error("Page sentiment analysis failed:", err);
        setMlError(`Page sentiment analysis failed: ${err.message}.`);
      } finally {
        setMlLoading(false);
      }
    };

    return (
      <div className="card notebook-page ml-page">
        <h2 className="card-title">Sentiment Analysis (ML)</h2>
        {mlError && (
          <div className="error-box" role="alert">
            <strong>Error!</strong>
            <span> {mlError}</span>
          </div>
        )}

        <div className="input-group column-group">
          <label htmlFor="page-select" className="input-label">Select a Page:</label>
          <select
            id="page-select"
            value={selectedPageForAnalysis}
            onChange={(e) => setSelectedPageForAnalysis(e.target.value)}
            className="input-field select-field"
            disabled={mlLoading || pages.length === 0}
          >
            <option value="">-- Choose a Page --</option>
            {pages.length > 0 ? (
              pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title || `Untitled Page (${page.id.substring(0, 4)}...)`}
                </option>
              ))
            ) : (
              <option value="" disabled>No pages available</option>
            )}
          </select>
        </div>

        <div className="button-group">
          <button
            onClick={analyzePageSentiment}
            className="button save-button"
            disabled={mlLoading || !selectedPageForAnalysis}
          >
            Analyze Page Sentiment
          </button>
          <button onClick={onBack} className="button cancel-button" disabled={mlLoading}>
            Back to Home
          </button>
        </div>

        {mlLoading && <p className="loading-text">Analyzing page content...</p>}
        {sentimentResult && (
          <div className={`sentiment-result ${sentimentResult.toLowerCase()} mt-4`}>
            <strong>Sentiment: </strong> <span>{sentimentResult}</span>
            {analyzedPageContent && (
              <div className="analyzed-text-preview mt-2 p-2 bg-gray-100 rounded-md text-sm italic">
                <p>Content analyzed:</p>
                <p className="break-words">{analyzedPageContent.substring(0, 200)}{analyzedPageContent.length > 200 ? '...' : ''}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Main App render logic based on currentPage state
  const renderPage = () => {
    switch (currentPage) {
      case 'list':
        return <PageList />;
      case 'create':
        return <PageForm onSave={() => { setCurrentPage('list'); fetchPages(); }} onCancel={() => setCurrentPage('list')} />;
      case 'view':
        return <PageView pageId={selectedPageId} onEdit={handleEditPage} onBack={() => setCurrentPage('list')} />;
      case 'edit':
        return <PageForm pageId={selectedPageId} onSave={() => { setCurrentPage('list'); fetchPages(); }} onCancel={() => setCurrentPage('list')} />;
      case 'ml':
        // Pass pages and fetchPages to MLPage
        return <MLPage onBack={() => setCurrentPage('list')} pages={pages} fetchPages={fetchPages} />;
      default:
        return <PageList />;
    }
  };

  return (
    <div className="app-container">
      <div className="header-buttons">
        <button onClick={() => setCurrentPage('list')} className={`button nav-button ${currentPage === 'list' ? 'active' : ''}`}>
          All Pages
        </button>
        <button onClick={() => setCurrentPage('create')} className={`button nav-button ${currentPage === 'create' ? 'active' : ''}`}>
          New Page
        </button>
        <button onClick={() => setCurrentPage('ml')} className={`button nav-button ${currentPage === 'ml' ? 'active' : ''}`}>
          ML Dev
        </button>
      </div>

      {renderPage()}
    </div>
  );
}

export default App;
