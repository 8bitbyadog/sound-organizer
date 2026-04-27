#!/usr/bin/env python
import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import numpy as np
import soundfile as sf
from pydub import AudioSegment
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('server.log')
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define port (default to 5000)
PORT = int(os.environ.get('PORT', 5000))

# Audio analysis functions
def analyze_bpm(audio_path):
    """Analyze BPM of an audio file using librosa."""
    try:
        y, sr = librosa.load(audio_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        return round(tempo)
    except Exception as e:
        logger.error(f"Error analyzing BPM: {str(e)}")
        return None

def analyze_key(audio_path):
    """Analyze musical key of an audio file using librosa."""
    try:
        # Load audio
        y, sr = librosa.load(audio_path)
        
        # Extract chroma features
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        
        # Compute key using chroma features
        # This is a simplified approach - not as accurate as essentia's key extractor
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        chroma_sum = np.sum(chroma, axis=1)
        key_idx = np.argmax(chroma_sum)
        
        # Determine if major or minor (simplified)
        major_profile = np.array([1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1])  # Major scale pattern
        minor_profile = np.array([1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0])  # Minor scale pattern
        
        # Rotate profiles to match the detected key
        major_profile = np.roll(major_profile, key_idx)
        minor_profile = np.roll(minor_profile, key_idx)
        
        # Normalize chroma
        chroma_norm = chroma_sum / np.sum(chroma_sum)
        
        # Calculate correlation with major and minor profiles
        major_corr = np.corrcoef(chroma_norm, major_profile)[0, 1]
        minor_corr = np.corrcoef(chroma_norm, minor_profile)[0, 1]
        
        key = key_names[key_idx]
        if minor_corr > major_corr:
            return f"{key}m"  # Minor key
        else:
            return key  # Major key
    except Exception as e:
        logger.error(f"Error analyzing key: {str(e)}")
        return None

def analyze_instrument(audio_path):
    """
    Analyze the dominant instrument/sound type in an audio file.
    This is a simplified version that uses spectral features to classify sounds.
    """
    try:
        # Load audio
        y, sr = librosa.load(audio_path)
        
        # Extract features
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr).mean()
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr).mean()
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr).mean()
        zero_crossing_rate = librosa.feature.zero_crossing_rate(y).mean()
        
        # Simple classification based on spectral features
        # This is a very basic approach and could be improved with ML models
        if spectral_centroid < 1000 and zero_crossing_rate < 0.05:
            return "bass"
        elif spectral_centroid > 3000 and spectral_bandwidth > 2000:
            return "synth"
        elif spectral_rolloff > 5000 and zero_crossing_rate > 0.1:
            return "drums"
        elif 1000 <= spectral_centroid <= 3000 and zero_crossing_rate < 0.1:
            return "vocals"
        else:
            return "other"
    except Exception as e:
        logger.error(f"Error analyzing instrument: {str(e)}")
        return None

# API Routes
@app.route('/analyze', methods=['POST'])
def analyze_audio():
    """Analyze an audio file and return metadata."""
    try:
        data = request.json
        file_path = data.get('file_path')
        options = data.get('options', {})
        
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        results = {}
        
        # Extract BPM if requested
        if options.get('extractBpm', True):
            results['bpm'] = analyze_bpm(file_path)
        
        # Extract key if requested
        if options.get('extractKey', True):
            results['key'] = analyze_key(file_path)
        
        # Extract instrument if requested
        if options.get('extractInstrument', True):
            results['instrument'] = analyze_instrument(file_path)
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Error in analyze_audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok'})

# Main entry point
if __name__ == '__main__':
    logger.info(f"Starting audio analysis server on port {PORT}")
    app.run(host='127.0.0.1', port=PORT, debug=True) 