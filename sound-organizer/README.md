# Sound Organizer

A desktop application for organizing and analyzing sound files for music production, podcasting, and audio work.

## Features

- Scan directories for audio files (WAV, MP3, OGG, FLAC, etc.)
- Tag and categorize sounds by type (drums, bass, synth, vocals, etc.)
- Preview sounds with the built-in audio player
- Rename files based on customizable patterns (e.g., [Category]-[Instrument]-[Key]-[BPM])
- Extract metadata from audio files (BPM, key, instrument type)
- Batch process multiple files
- Search and filter sounds by tags, names, or metadata
- Export/import tag databases

## Technologies Used

- **Frontend**: Electron.js with HTML, CSS, and JavaScript
- **Backend**: Python with Flask for audio analysis
- **Audio Analysis**: librosa, essentia, and other Python libraries

## Installation

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- pip

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/sound-organizer.git
   cd sound-organizer
   ```

2. Install Electron dependencies:
   ```
   cd electron-app
   npm install
   ```

3. Set up Python environment:
   ```
   cd ../python-backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Usage

1. Start the application:
   ```
   cd electron-app
   npm start
   ```

2. Click "Select Directory" to choose a folder containing audio files.

3. Use the sidebar filters to find specific types of sounds.

4. Select files and use the batch actions to analyze, rename, or tag them.

5. Double-click on a file to preview it in the audio player.

## Audio Analysis

The application uses several techniques to analyze audio files:

- **BPM Detection**: Uses librosa's beat tracking algorithms
- **Key Detection**: Uses essentia's key extractor
- **Instrument Classification**: Uses spectral features to identify the dominant instrument/sound type

## Customization

### File Naming Patterns

You can customize how files are renamed after analysis using the following tags:

- `[Category]`: The sound category (drums, bass, synth, etc.)
- `[Instrument]`: The detected instrument type
- `[Key]`: The musical key
- `[BPM]`: The beats per minute
- `[Name]`: The original file name
- `[Date]`: The current date

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

## Acknowledgements

- [Electron](https://www.electronjs.org/)
- [Flask](https://flask.palletsprojects.com/)
- [librosa](https://librosa.org/)
- [essentia](https://essentia.upf.edu/)
- [Material Icons](https://material.io/resources/icons/) 