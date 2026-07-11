import React, { useState } from "react";

export default function ProjectsSidebar({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onSelectSandbox,
  isOpen,
  onToggleSidebar
}) {
  const [newProjName, setNewProjName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    onCreateProject(newProjName.trim());
    setNewProjName("");
    setIsCreating(false);
  };

  const handleRenameSubmit = (id) => {
    if (!editingName.trim()) return;
    onRenameProject(id, editingName.trim());
    setEditingId(null);
    setEditingName("");
  };

  return (
    <aside className={`projects-sidebar ${isOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">📁 Workspace</h2>
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isOpen ? "◀" : "▶"}
        </button>
      </div>

      {isOpen && (
        <div className="sidebar-content animate-fade-in">
          {/* New Project Button / Form */}
          {!isCreating ? (
            <button className="new-project-btn" onClick={() => setIsCreating(true)}>
              <span className="btn-icon">+</span> New Project
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="new-project-form">
              <input
                type="text"
                placeholder="Project Name..."
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                autoFocus
                className="new-project-input"
              />
              <div className="new-project-actions">
                <button type="submit" className="action-btn save-btn">Create</button>
                <button type="button" className="action-btn cancel-btn" onClick={() => setIsCreating(false)}>Cancel</button>
              </div>
            </form>
          )}

          {/* Navigation Modes */}
          <div className="sidebar-section">
            <h3 className="section-title">Modes</h3>
            <button
              className={`sidebar-item sandbox-item ${!activeProject ? "active" : ""}`}
              onClick={onSelectSandbox}
            >
              <span className="item-icon">🧪</span>
              <span className="item-label">Sandbox Playboard</span>
            </button>
          </div>

          {/* Projects List */}
          <div className="sidebar-section projects-section">
            <h3 className="section-title">Projects ({projects.length})</h3>
            <div className="projects-list-container">
              {projects.length === 0 ? (
                <div className="empty-projects">No projects created yet.</div>
              ) : (
                projects.map((proj) => {
                  const isActive = activeProject && activeProject.id === proj.id;
                  const isEditing = editingId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={`sidebar-item project-item ${isActive ? "active" : ""}`}
                    >
                      <div className="project-item-main" onClick={() => !isEditing && onSelectProject(proj.id)}>
                        <span className="item-icon">📊</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleRenameSubmit(proj.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSubmit(proj.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                            className="project-rename-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="item-label" title={proj.name}>
                            {proj.name}
                          </span>
                        )}
                      </div>

                      <div className="project-item-actions">
                        {!isEditing && (
                          <>
                            <button
                              className="item-action-btn edit-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(proj.id);
                                setEditingName(proj.name);
                              }}
                              title="Rename Project"
                            >
                              ✏️
                            </button>
                            <button
                              className="item-action-btn delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete "${proj.name}"?`)) {
                                  onDeleteProject(proj.id);
                                }
                              }}
                              title="Delete Project"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
