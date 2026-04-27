// Global state
const state = {
  currentDirectory: null,
  audioFiles: [],
  selectedFiles: [],
  filteredFiles: [],
  tags: [],
  settings: {},
  currentAudio: null,
  audioPlayer: new Audio(),
  viewMode: 'grid' // 'grid' or 'list'
};

// DOM Elements
const elements = {
  selectDirectoryBtn: document.getElementById('select-directory-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  filesContainer: document.getElementById('files-container'),
  tagsContainer: document.getElementById('tags-container'),
  newTagInput: document.getElementById('new-tag-input'),
  addTagBtn: document.getElementById('add-tag-btn'),
  viewGridBtn: document.getElementById('view-grid-btn'),
  viewListBtn: document.getElementById('view-list-btn'),
  analyzeSelectedBtn: document.getElementById('analyze-selected-btn'),
  renameSelectedBtn: document.getElementById('rename-selected-btn'),
  tagSelectedBtn: document.getElementById('tag-selected-btn'),
  searchInput: document.getElementById('search-input'),
  filterType: document.getElementById('filter-type'),
  filterKey: document.getElementById('filter-key'),
  filterBpmMin: document.getElementById('filter-bpm-min'),
  filterBpmMax: document.getElementById('filter-bpm-max'),
  applyFiltersBtn: document.getElementById('apply-filters-btn'),
  clearFiltersBtn: document.getElementById('clear-filters-btn'),
  
  // Player elements
  playBtn: document.getElementById('play-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  stopBtn: document.getElementById('stop-btn'),
  progressBar: document.getElementById('progress-fill'),
  currentTime: document.getElementById('current-time'),
  totalTime: document.getElementById('total-time'),
  volumeSlider: document.getElementById('volume-slider'),
  nowPlayingName: document.getElementById('now-playing-name'),
  
  // Modals
  settingsModal: document.getElementById('settings-modal'),
  renameModal: document.getElementById('rename-modal'),
  tagModal: document.getElementById('tag-modal'),
  
  // Settings elements
  namingPattern: document.getElementById('naming-pattern'),
  extractBpm: document.getElementById('extract-bpm'),
  extractKey: document.getElementById('extract-key'),
  extractInstrument: document.getElementById('extract-instrument'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  exportDbBtn: document.getElementById('export-db-btn'),
  importDbBtn: document.getElementById('import-db-btn'),
  
  // Rename elements
  renamePattern: document.getElementById('rename-pattern'),
  renamePreview: document.getElementById('rename-preview'),
  applyRenameBtn: document.getElementById('apply-rename-btn'),
  
  // Tag elements
  availableTags: document.getElementById('available-tags'),
  newBatchTag: document.getElementById('new-batch-tag'),
  addBatchTagBtn: document.getElementById('add-batch-tag-btn'),
  categorySelect: document.getElementById('category-select'),
  applyTagsBtn: document.getElementById('apply-tags-btn')
};

// Initialize the application
async function init() {
  // Load settings
  await loadSettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up audio player
  setupAudioPlayer();
}

// Load user settings
async function loadSettings() {
  try {
    state.settings = await window.api.loadSettings();
    
    // Apply settings to UI
    if (state.settings.namingPattern) {
      elements.namingPattern.value = state.settings.namingPattern;
    }
    
    if (state.settings.extractBpm !== undefined) {
      elements.extractBpm.checked = state.settings.extractBpm;
    }
    
    if (state.settings.extractKey !== undefined) {
      elements.extractKey.checked = state.settings.extractKey;
    }
    
    if (state.settings.extractInstrument !== undefined) {
      elements.extractInstrument.checked = state.settings.extractInstrument;
    }
    
    // Load tags
    if (state.settings.tags) {
      state.tags = state.settings.tags;
      renderTags();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save user settings
async function saveSettings() {
  const settings = {
    namingPattern: elements.namingPattern.value,
    extractBpm: elements.extractBpm.checked,
    extractKey: elements.extractKey.checked,
    extractInstrument: elements.extractInstrument.checked,
    tags: state.tags
  };
  
  try {
    await window.api.saveSettings(settings);
    state.settings = settings;
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // Directory selection
  elements.selectDirectoryBtn.addEventListener('click', selectDirectory);
  
  // Settings
  elements.settingsBtn.addEventListener('click', () => toggleModal(elements.settingsModal));
  elements.saveSettingsBtn.addEventListener('click', async () => {
    await saveSettings();
    toggleModal(elements.settingsModal);
  });
  
  // View mode
  elements.viewGridBtn.addEventListener('click', () => setViewMode('grid'));
  elements.viewListBtn.addEventListener('click', () => setViewMode('list'));
  
  // Batch actions
  elements.analyzeSelectedBtn.addEventListener('click', analyzeSelectedFiles);
  elements.renameSelectedBtn.addEventListener('click', showRenameModal);
  elements.tagSelectedBtn.addEventListener('click', showTagModal);
  
  // Filters
  elements.applyFiltersBtn.addEventListener('click', applyFilters);
  elements.clearFiltersBtn.addEventListener('click', clearFilters);
  elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
  
  // Tags
  elements.addTagBtn.addEventListener('click', addTag);
  elements.newTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTag();
  });
  
  // Rename modal
  elements.renamePattern.addEventListener('input', updateRenamePreview);
  elements.applyRenameBtn.addEventListener('click', applyRename);
  
  // Tag modal
  elements.addBatchTagBtn.addEventListener('click', addBatchTag);
  elements.applyTagsBtn.addEventListener('click', applyTags);
  
  // Database
  elements.exportDbBtn.addEventListener('click', exportTagDatabase);
  elements.importDbBtn.addEventListener('click', importTagDatabase);
  
  // Close modals
  document.querySelectorAll('.close-modal-btn, .cancel-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
      });
    });
  });
}

// Set up audio player
function setupAudioPlayer() {
  // Player controls
  elements.playBtn.addEventListener('click', playAudio);
  elements.pauseBtn.addEventListener('click', pauseAudio);
  elements.stopBtn.addEventListener('click', stopAudio);
  elements.volumeSlider.addEventListener('input', setVolume);
  
  // Update progress bar
  state.audioPlayer.addEventListener('timeupdate', updateProgress);
  state.audioPlayer.addEventListener('loadedmetadata', () => {
    elements.totalTime.textContent = formatTime(state.audioPlayer.duration);
  });
  
  // Enable controls when audio is loaded
  state.audioPlayer.addEventListener('canplay', () => {
    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = false;
    elements.stopBtn.disabled = false;
  });
  
  // Disable controls when audio ends
  state.audioPlayer.addEventListener('ended', () => {
    elements.progressBar.style.width = '0%';
    elements.currentTime.textContent = '0:00';
    elements.playBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    elements.stopBtn.disabled = true;
  });
  
  // Set initial volume
  state.audioPlayer.volume = elements.volumeSlider.value / 100;
}

// Select directory and load audio files
async function selectDirectory() {
  try {
    const directoryPath = await window.api.selectDirectory();
    
    if (directoryPath) {
      state.currentDirectory = directoryPath;
      const files = await window.api.getAudioFiles(directoryPath);
      
      state.audioFiles = files;
      state.filteredFiles = [...files];
      
      renderFiles();
    }
  } catch (error) {
    console.error('Error selecting directory:', error);
  }
}

// Render audio files in the container
function renderFiles() {
  elements.filesContainer.innerHTML = '';
  
  if (state.filteredFiles.length === 0) {
    elements.filesContainer.innerHTML = `
      <div class="empty-state">
        <span class="material-icons large">audio_file</span>
        <p>${state.audioFiles.length > 0 ? 'No files match your filters' : 'No audio files found'}</p>
      </div>
    `;
    return;
  }
  
  state.filteredFiles.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.path = file.path;
    
    const isSelected = state.selectedFiles.some(selectedFile => selectedFile.path === file.path);
    if (isSelected) {
      fileItem.classList.add('selected');
    }
    
    // Get file metadata if available
    const metadata = file.metadata || {};
    
    // Create file item content
    fileItem.innerHTML = `
      <div class="file-icon">
        <span class="material-icons">audio_file</span>
      </div>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-meta">
          ${metadata.bpm ? `<div class="meta-item"><span class="material-icons">speed</span>${metadata.bpm} BPM</div>` : ''}
          ${metadata.key ? `<div class="meta-item"><span class="material-icons">music_note</span>${metadata.key}</div>` : ''}
          ${metadata.instrument ? `<div class="meta-item"><span class="material-icons">piano</span>${metadata.instrument}</div>` : ''}
          ${metadata.category ? `<div class="meta-item"><span class="material-icons">category</span>${metadata.category}</div>` : ''}
        </div>
        <div class="file-tags">
          ${(file.tags || []).map(tag => `<div class="file-tag">${tag}</div>`).join('')}
        </div>
      </div>
    `;
    
    // Add event listeners
    fileItem.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        toggleFileSelection(file);
      } else {
        selectFile(file);
      }
    });
    
    fileItem.addEventListener('dblclick', () => {
      loadAudio(file);
    });
    
    elements.filesContainer.appendChild(fileItem);
  });
}

// Toggle file selection (for multiple selection)
function toggleFileSelection(file) {
  const index = state.selectedFiles.findIndex(selectedFile => selectedFile.path === file.path);
  
  if (index === -1) {
    state.selectedFiles.push(file);
  } else {
    state.selectedFiles.splice(index, 1);
  }
  
  updateSelectedFilesUI();
}

// Select a single file
function selectFile(file) {
  state.selectedFiles = [file];
  updateSelectedFilesUI();
}

// Update UI to reflect selected files
function updateSelectedFilesUI() {
  document.querySelectorAll('.file-item').forEach(item => {
    const path = item.dataset.path;
    const isSelected = state.selectedFiles.some(file => file.path === path);
    
    if (isSelected) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  // Enable/disable batch action buttons
  const hasSelection = state.selectedFiles.length > 0;
  elements.analyzeSelectedBtn.disabled = !hasSelection;
  elements.renameSelectedBtn.disabled = !hasSelection;
  elements.tagSelectedBtn.disabled = !hasSelection;
}

// Set view mode (grid or list)
function setViewMode(mode) {
  state.viewMode = mode;
  
  if (mode === 'grid') {
    elements.filesContainer.classList.remove('list-view');
    elements.filesContainer.classList.add('grid-view');
    elements.viewGridBtn.classList.add('active');
    elements.viewListBtn.classList.remove('active');
  } else {
    elements.filesContainer.classList.remove('grid-view');
    elements.filesContainer.classList.add('list-view');
    elements.viewGridBtn.classList.remove('active');
    elements.viewListBtn.classList.add('active');
  }
}

// Apply filters to the audio files
function applyFilters() {
  const type = elements.filterType.value;
  const key = elements.filterKey.value;
  const bpmMin = elements.filterBpmMin.value ? parseInt(elements.filterBpmMin.value) : 0;
  const bpmMax = elements.filterBpmMax.value ? parseInt(elements.filterBpmMax.value) : Infinity;
  const searchTerm = elements.searchInput.value.toLowerCase();
  
  state.filteredFiles = state.audioFiles.filter(file => {
    const metadata = file.metadata || {};
    
    // Filter by type/category
    if (type && metadata.category !== type) {
      return false;
    }
    
    // Filter by key
    if (key && metadata.key !== key) {
      return false;
    }
    
    // Filter by BPM range
    if (metadata.bpm) {
      const bpm = parseInt(metadata.bpm);
      if (bpm < bpmMin || bpm > bpmMax) {
        return false;
      }
    }
    
    // Filter by search term
    if (searchTerm) {
      const nameMatch = file.name.toLowerCase().includes(searchTerm);
      const tagMatch = (file.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
      
      if (!nameMatch && !tagMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  renderFiles();
}

// Clear all filters
function clearFilters() {
  elements.filterType.value = '';
  elements.filterKey.value = '';
  elements.filterBpmMin.value = '';
  elements.filterBpmMax.value = '';
  elements.searchInput.value = '';
  
  state.filteredFiles = [...state.audioFiles];
  renderFiles();
}

// Add a new tag
function addTag() {
  const tagName = elements.newTagInput.value.trim();
  
  if (tagName && !state.tags.includes(tagName)) {
    state.tags.push(tagName);
    elements.newTagInput.value = '';
    
    renderTags();
    saveSettings();
  }
}

// Render tags in the sidebar
function renderTags() {
  elements.tagsContainer.innerHTML = '';
  
  state.tags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.innerHTML = `
      ${tag}
      <span class="remove-tag material-icons">close</span>
    `;
    
    tagElement.querySelector('.remove-tag').addEventListener('click', () => {
      removeTag(tag);
    });
    
    tagElement.addEventListener('click', (e) => {
      if (!e.target.classList.contains('remove-tag')) {
        filterByTag(tag);
      }
    });
    
    elements.tagsContainer.appendChild(tagElement);
  });
}

// Remove a tag
function removeTag(tagName) {
  state.tags = state.tags.filter(tag => tag !== tagName);
  
  // Also remove this tag from all files
  state.audioFiles.forEach(file => {
    if (file.tags) {
      file.tags = file.tags.filter(tag => tag !== tagName);
    }
  });
  
  renderTags();
  renderFiles();
  saveSettings();
}

// Filter files by tag
function filterByTag(tagName) {
  state.filteredFiles = state.audioFiles.filter(file => {
    return file.tags && file.tags.includes(tagName);
  });
  
  renderFiles();
}

// Show rename modal
function showRenameModal() {
  if (state.selectedFiles.length === 0) return;
  
  elements.renamePattern.value = state.settings.namingPattern || '[Category]-[Instrument]-[Key]-[BPM]';
  updateRenamePreview();
  
  toggleModal(elements.renameModal);
}

// Update rename preview
function updateRenamePreview() {
  const pattern = elements.renamePattern.value;
  elements.renamePreview.innerHTML = '';
  
  state.selectedFiles.forEach(file => {
    const metadata = file.metadata || {};
    const oldName = file.name;
    const newName = generateFileName(file, pattern);
    
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.innerHTML = `
      <div class="old-name">${oldName}</div>
      <div class="arrow">→</div>
      <div class="new-name">${newName}</div>
    `;
    
    elements.renamePreview.appendChild(previewItem);
  });
}

// Generate a file name based on pattern and metadata
function generateFileName(file, pattern) {
  const metadata = file.metadata || {};
  const ext = file.extension;
  const name = file.name.replace(ext, '');
  
  let newName = pattern
    .replace('[Category]', metadata.category || 'unknown')
    .replace('[Instrument]', metadata.instrument || 'unknown')
    .replace('[Key]', metadata.key || 'unknown')
    .replace('[BPM]', metadata.bpm || 'unknown')
    .replace('[Name]', name)
    .replace('[Date]', new Date().toISOString().split('T')[0]);
  
  return newName + ext;
}

// Apply rename to selected files
async function applyRename() {
  const pattern = elements.renamePattern.value;
  
  for (const file of state.selectedFiles) {
    const newName = generateFileName(file, pattern);
    const dirPath = file.directory;
    const newPath = `${dirPath}/${newName}`;
    
    try {
      await window.api.renameFile(file.path, newPath);
      
      // Update file in state
      const index = state.audioFiles.findIndex(f => f.path === file.path);
      if (index !== -1) {
        state.audioFiles[index].path = newPath;
        state.audioFiles[index].name = newName;
      }
    } catch (error) {
      console.error(`Error renaming file ${file.name}:`, error);
    }
  }
  
  // Update filtered files
  state.filteredFiles = state.filteredFiles.map(file => {
    const match = state.audioFiles.find(f => f.path === file.path);
    return match || file;
  });
  
  renderFiles();
  toggleModal(elements.renameModal);
}

// Show tag modal
function showTagModal() {
  if (state.selectedFiles.length === 0) return;
  
  // Render available tags
  elements.availableTags.innerHTML = '';
  
  state.tags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.textContent = tag;
    tagElement.dataset.tag = tag;
    
    // Check if all selected files have this tag
    const allHaveTag = state.selectedFiles.every(file => 
      file.tags && file.tags.includes(tag)
    );
    
    if (allHaveTag) {
      tagElement.classList.add('active');
    }
    
    tagElement.addEventListener('click', () => {
      tagElement.classList.toggle('active');
    });
    
    elements.availableTags.appendChild(tagElement);
  });
  
  // Reset category select
  elements.categorySelect.value = '';
  
  toggleModal(elements.tagModal);
}

// Add a new batch tag
function addBatchTag() {
  const tagName = elements.newBatchTag.value.trim();
  
  if (tagName && !state.tags.includes(tagName)) {
    state.tags.push(tagName);
    elements.newBatchTag.value = '';
    
    // Add the new tag to the available tags
    const tagElement = document.createElement('div');
    tagElement.className = 'tag active';
    tagElement.textContent = tagName;
    tagElement.dataset.tag = tagName;
    
    tagElement.addEventListener('click', () => {
      tagElement.classList.toggle('active');
    });
    
    elements.availableTags.appendChild(tagElement);
    
    saveSettings();
  }
}

// Apply tags to selected files
function applyTags() {
  const selectedTags = Array.from(elements.availableTags.querySelectorAll('.tag.active'))
    .map(tag => tag.dataset.tag);
  
  const category = elements.categorySelect.value;
  
  state.selectedFiles.forEach(file => {
    // Initialize tags array if it doesn't exist
    if (!file.tags) {
      file.tags = [];
    }
    
    // Add selected tags
    selectedTags.forEach(tag => {
      if (!file.tags.includes(tag)) {
        file.tags.push(tag);
      }
    });
    
    // Set category if selected
    if (category) {
      if (!file.metadata) {
        file.metadata = {};
      }
      file.metadata.category = category;
    }
  });
  
  renderFiles();
  toggleModal(elements.tagModal);
  saveSettings();
}

// Analyze selected files
async function analyzeSelectedFiles() {
  if (state.selectedFiles.length === 0) return;
  
  const analysisOptions = {
    extractBpm: elements.extractBpm.checked,
    extractKey: elements.extractKey.checked,
    extractInstrument: elements.extractInstrument.checked
  };
  
  for (const file of state.selectedFiles) {
    try {
      const results = await window.api.analyzeAudio(file.path, analysisOptions);
      
      // Update file metadata
      if (!file.metadata) {
        file.metadata = {};
      }
      
      if (results.bpm) {
        file.metadata.bpm = results.bpm;
      }
      
      if (results.key) {
        file.metadata.key = results.key;
      }
      
      if (results.instrument) {
        file.metadata.instrument = results.instrument;
      }
    } catch (error) {
      console.error(`Error analyzing file ${file.name}:`, error);
    }
  }
  
  renderFiles();
}

// Export tag database
async function exportTagDatabase() {
  try {
    const data = {
      tags: state.tags,
      files: state.audioFiles.map(file => ({
        path: file.path,
        tags: file.tags || [],
        metadata: file.metadata || {}
      }))
    };
    
    await window.api.exportTagDatabase(data);
  } catch (error) {
    console.error('Error exporting tag database:', error);
  }
}

// Import tag database
async function importTagDatabase() {
  try {
    const data = await window.api.importTagDatabase();
    
    if (data) {
      state.tags = data.tags || [];
      
      // Update files with imported data
      data.files.forEach(importedFile => {
        const file = state.audioFiles.find(f => f.path === importedFile.path);
        
        if (file) {
          file.tags = importedFile.tags || [];
          file.metadata = importedFile.metadata || {};
        }
      });
      
      renderTags();
      renderFiles();
      saveSettings();
    }
  } catch (error) {
    console.error('Error importing tag database:', error);
  }
}

// Load audio for playback
function loadAudio(file) {
  state.currentAudio = file;
  state.audioPlayer.src = `file://${file.path}`;
  elements.nowPlayingName.textContent = file.name;
  
  playAudio();
}

// Play audio
function playAudio() {
  if (state.audioPlayer.src) {
    state.audioPlayer.play();
    elements.playBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    elements.stopBtn.disabled = false;
  }
}

// Pause audio
function pauseAudio() {
  state.audioPlayer.pause();
  elements.playBtn.disabled = false;
  elements.pauseBtn.disabled = true;
}

// Stop audio
function stopAudio() {
  state.audioPlayer.pause();
  state.audioPlayer.currentTime = 0;
  elements.playBtn.disabled = false;
  elements.pauseBtn.disabled = true;
  elements.stopBtn.disabled = true;
}

// Update progress bar
function updateProgress() {
  const percent = (state.audioPlayer.currentTime / state.audioPlayer.duration) * 100;
  elements.progressBar.style.width = `${percent}%`;
  elements.currentTime.textContent = formatTime(state.audioPlayer.currentTime);
}

// Set volume
function setVolume() {
  state.audioPlayer.volume = elements.volumeSlider.value / 100;
}

// Format time in seconds to MM:SS
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Toggle modal visibility
function toggleModal(modal) {
  document.querySelectorAll('.modal').forEach(m => {
    m.classList.remove('active');
  });
  
  modal.classList.add('active');
}

// Debounce function for search input
function debounce(func, delay) {
  let timeout;
  
  return function() {
    const context = this;
    const args = arguments;
    
    clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 